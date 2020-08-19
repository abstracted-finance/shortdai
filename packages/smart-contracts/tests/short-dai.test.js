const ethers = require("ethers");

const {
  ERC20_ADDRESSES,
  ETH_ADDRESS,
  CONTRACT_ADDRESSES,
  ERC20_DECIMALS,
} = require("../cli/utils/constants");

const { setupContract, setupIDSProxy } = require("../cli/utils/setup");

const { swapOnOneSplit, wallets } = require("./common");

let IDssCdpManager;
let ShortDAIActions;
let CloseShortDAI;
let OpenShortDAI;
let IDSProxy;
let VaultStats;
let USDC;

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
    USDC = await setupContract({
      signer: user,
      wallets,
      name: "IERC20",
      address: ERC20_ADDRESSES.USDC,
    });
    IDSProxy = await setupIDSProxy({ user });
  } catch (e) {
    console.log(e);
  }
});

test("open and close short (new) vault position", async function () {
  // Initial cdpId
  const initialCdpId = await IDssCdpManager.last(IDSProxy.address);

  // Open parameters
  const flashloanDaiAmount = ethers.utils.parseUnits("101", ERC20_DECIMALS.DAI);
  const initialUsdcMargin = ethers.utils.parseUnits("100", ERC20_DECIMALS.USDC);

  // Stats
  const daiUsdcRatio6 = ethers.utils.parseUnits("1.03", ERC20_DECIMALS.USDC);

  await swapOnOneSplit(user, {
    fromToken: ETH_ADDRESS,
    toToken: ERC20_ADDRESSES.USDC,
    amountWei: ethers.utils.parseUnits("1"),
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
      flashloanDaiAmount,
      VaultStats.address,
      daiUsdcRatio6,
    ]
  );

  const openTx = await IDSProxy[
    "execute(address,bytes)"
  ](ShortDAIActions.address, openCalldata, { gasLimit: 1200000 });
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
    parseInt(flashloanDaiAmount.toString()),
    10
  );

  // Close CDP
  const closeCalldata = ShortDAIActions.interface.encodeFunctionData(
    "flashloanAndClose",
    [
      CloseShortDAI.address,
      CONTRACT_ADDRESSES.ISoloMargin,
      CONTRACT_ADDRESSES.CurveFiSUSDv2,
      newCdpId,
    ]
  );

  const closeTx = await IDSProxy[
    "execute(address,bytes)"
  ](ShortDAIActions.address, closeCalldata, { gasLimit: 1200000 });
  await closeTx.wait();

  const closeVaultState = await VaultStats.getCdpStats(newCdpId);
  const closeVaultStateBorrowed = closeVaultState[1];

  // In Wei
  expect(parseInt(closeVaultStateBorrowed.toString())).toBeLessThan(
    parseInt(openVaultStateBorrowed.toString())
  );
});
