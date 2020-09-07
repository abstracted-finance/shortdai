const ethers = require("ethers");

const {
  ERC20_ADDRESSES,
  ETH_ADDRESS,
  CONTRACT_ADDRESSES,
  ERC20_DECIMALS,
} = require("../cli/utils/constants");

const { setupContract, setupIDSProxy } = require("../cli/utils/setup");

const { swapOnOneSplit, wallets } = require("./common");
const { addSnapshotBeforeRestoreAfterEach } = require("./utils");

const fetch = require("node-fetch");

let IDssCdpManager;
let ShortDAIActions;
let CloseShortDAI;
let OpenShortDAI;
let IDSProxy;
let VaultStats;
let USDC;
let DAI;
let ICurveFiCurve;

const user = wallets[2];

beforeAll(async function () {
  try {
    VaultStats = await setupContract({
      signer: user,
      wallets,
      name: "VaultStats",
    });
    ShortDAIActions = await setupContract({
      signer: user,
      wallets,
      name: "ShortDAIActions",
    });
    OpenShortDAI = await setupContract({
      signer: user,
      wallets,
      name: "OpenShortDAI",
    });
    CloseShortDAI = await setupContract({
      signer: user,
      wallets,
      name: "CloseShortDAI",
    });
    IDssCdpManager = await setupContract({
      signer: user,
      wallets,
      name: "IDssCdpManager",
      address: CONTRACT_ADDRESSES.IDssCdpManager,
    });
    ICurveFiCurve = await setupContract({
      signer: user,
      wallets,
      name: "ICurveFiCurve",
      address: CONTRACT_ADDRESSES.CurveFiSUSDv2,
    });
    USDC = await setupContract({
      signer: user,
      wallets,
      name: "IERC20",
      address: ERC20_ADDRESSES.USDC,
    });
    DAI = await setupContract({
      signer: user,
      wallets,
      name: "IERC20",
      address: ERC20_ADDRESSES.DAI,
    });
    IDSProxy = await setupIDSProxy({ user });
  } catch (e) {
    console.log(e);
  }
});

addSnapshotBeforeRestoreAfterEach();

test("open and close short (new) vault position", async function () {
  // Get Price
  const gecko = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
    {
      referrer: "https://www.coingecko.com/",
      body: null,
      method: "GET",
      mode: "cors",
      credentials: "omit",
    }
  );
  const geckoData = await gecko.json();
  const ethDaiRatio = geckoData.ethereum.usd; // Just to make sure we have deposited enough ETH
  const ethDaiRatio18 = ethers.utils.parseUnits(ethDaiRatio.toString(), 18);

  // Initial cdpId
  const initialCdpId = await IDssCdpManager.last(IDSProxy.address);

  // Open parameters
  const mintAmountDai = ethers.utils.parseUnits("900000", ERC20_DECIMALS.DAI);
  const initialUsdcMargin = ethers.utils.parseUnits(
    "100000",
    ERC20_DECIMALS.USDC
  );
  const flashloanAmountWeth = mintAmountDai
    .mul(ethers.utils.parseUnits("1", 18))
    .div(ethDaiRatio18.div(2)); // Dividing by 2 to get 200% col ratio

  // Stats
  const daiUsdcRatio6 = ethers.utils.parseUnits("1.02", ERC20_DECIMALS.USDC);

  await swapOnOneSplit(user, {
    fromToken: ETH_ADDRESS,
    toToken: ERC20_ADDRESSES.USDC,
    amountWei: ethers.utils.parseUnits("1000"),
  });

  await USDC.approve(IDSProxy.address, initialUsdcMargin);

  const openCalldata = ShortDAIActions.interface.encodeFunctionData(
    "flashloanAndOpen",
    [
      OpenShortDAI.address,
      CONTRACT_ADDRESSES.ISoloMargin,
      CONTRACT_ADDRESSES.CurveFiSUSDv2,
      0,
      initialUsdcMargin,
      mintAmountDai,
      flashloanAmountWeth,
      VaultStats.address,
      daiUsdcRatio6,
    ]
  );

  const openTx = await IDSProxy[
    "execute(address,bytes)"
  ](ShortDAIActions.address, openCalldata, { value: 2, gasLimit: 1500000 });
  await openTx.wait();

  // Gets cdpId
  const newCdpId = await IDssCdpManager.last(IDSProxy.address);
  expect(newCdpId).not.toEqual(initialCdpId);

  // Makes sure vault debt is equal to borrowedDaiAmount
  const openVaultState = await VaultStats.getCdpStats(newCdpId);
  const openVaultStateBorrowed = openVaultState[1];
  const openVaultStateOpenDaiUsdcRatio6 = openVaultState[2];

  // Example on calculating stability rates
  // https://docs.makerdao.com/smart-contract-modules/rates-module
  // const RAY = ethers.BigNumber.from("1000000000000000000000000000");
  // const r = parseFloat(openVaultState.duty) / parseFloat(RAY);
  // const stabilityFee = Math.pow(r, 365 * 24 * 60 * 60);

  expect(daiUsdcRatio6).toEqual(openVaultStateOpenDaiUsdcRatio6);
  expect(parseInt(openVaultStateBorrowed.toString())).toBeCloseTo(
    parseInt(mintAmountDai.toString()),
    10
  );

  // Supply a TON of DAI to Curve to drop down the price
  // of DAI on Curve's pool
  await swapOnOneSplit(user, {
    fromToken: ETH_ADDRESS,
    toToken: ERC20_ADDRESSES.DAI,
    amountWei: ethers.utils.parseUnits("1000"),
  });
  const supplyDaiBal = await DAI.balanceOf(user.address);
  await DAI.approve(ICurveFiCurve.address, supplyDaiBal);
  await ICurveFiCurve["exchange_underlying(int128,int128,uint256,uint256)"](
    0,
    1,
    supplyDaiBal,
    0,
    { gasLimit: 1200000 }
  );

  // Close CDP
  const closeCalldata = ShortDAIActions.interface.encodeFunctionData(
    "flashloanAndClose",
    [
      CloseShortDAI.address,
      CONTRACT_ADDRESSES.ISoloMargin,
      CONTRACT_ADDRESSES.CurveFiSUSDv2,
      newCdpId,
      ethDaiRatio18,
    ]
  );

  const beforeUsdcBal = await USDC.balanceOf(user.address);

  const closeTx = await IDSProxy[
    "execute(address,bytes)"
  ](ShortDAIActions.address, closeCalldata, { value: 2, gasLimit: 2000000 });
  await closeTx.wait();

  const afterUsdcBal = await USDC.balanceOf(user.address);

  const closeVaultState = await VaultStats.getCdpStats(newCdpId);
  const closeVaultStateBorrowed = closeVaultState[1];

  // In Wei
  expect(parseInt(closeVaultStateBorrowed.toString())).toBeLessThan(
    parseInt(openVaultStateBorrowed.toString())
  );

  console.log(
    "Initial USDC margin ",
    ethers.utils.formatUnits(initialUsdcMargin, 6)
  );
  console.log("Before USDC Bal ", ethers.utils.formatUnits(beforeUsdcBal, 6));
  console.log("After USDC Bal ", ethers.utils.formatUnits(afterUsdcBal, 6));

  expect(afterUsdcBal.gt(beforeUsdcBal)).toEqual(true);
});
