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
let CloseShortDAIActions;
let CloseShortDAI;
let OpenShortDAIActions;
let OpenShortDAI;
let IDSProxy;
let USDC;
let DAI;
let VaultPositionReader;

const user = wallets[2];

beforeAll(async function () {
  try {
    OpenShortDAIActions = await setupContract({
      signer: user,
      wallets,
      name: "OpenShortDAIActions",
    });
    OpenShortDAI = await setupContract({
      signer: user,
      wallets,
      name: "OpenShortDAI",
    });
    CloseShortDAIActions = await setupContract({
      signer: user,
      wallets,
      name: "CloseShortDAIActions",
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
    DAI = await setupContract({
      signer: user,
      wallets,
      name: "IERC20",
      address: ERC20_ADDRESSES.DAI,
    });
    USDC = await setupContract({
      signer: user,
      wallets,
      name: "IERC20",
      address: ERC20_ADDRESSES.USDC,
    });
    VaultPositionReader = await setupContract({
      signer: user,
      wallets,
      name: "VaultPositionReader",
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
  const flashloanDaiAmount = ethers.utils.parseUnits("25", ERC20_DECIMALS.DAI);
  const initialUsdcMargin = ethers.utils.parseUnits("100", ERC20_DECIMALS.USDC);

  await swapOnOneSplit(user, {
    fromToken: ETH_ADDRESS,
    toToken: ERC20_ADDRESSES.USDC,
    amountWei: ethers.utils.parseUnits("1"),
  });
  await USDC.approve(IDSProxy.address, initialUsdcMargin);

  const openCalldata = OpenShortDAIActions.interface.encodeFunctionData(
    "flashloanAndOpen",
    [
      OpenShortDAI.address,
      CONTRACT_ADDRESSES.ISoloMargin,
      CONTRACT_ADDRESSES.CurveFiSUSDv2,
      0,
      initialUsdcMargin,
      flashloanDaiAmount,
    ]
  );

  const openTx = await IDSProxy[
    "execute(address,bytes)"
  ](OpenShortDAIActions.address, openCalldata, { gasLimit: 1000000 });
  await openTx.wait();

  // Gets cdpId
  const newCdpId = await IDssCdpManager.last(IDSProxy.address);
  expect(newCdpId).not.toEqual(initialCdpId);

  // Makes sure vault debt is equal to borrowedDaiAmount
  const openVaultState = await VaultPositionReader.getVaultStats(newCdpId);

  console.log("openVaultState", openVaultState);

  // Example on calculating stability rates
  // https://docs.makerdao.com/smart-contract-modules/rates-module
  // const RAY = ethers.BigNumber.from("1000000000000000000000000000");
  // const r = parseFloat(openVaultState.duty) / parseFloat(RAY);
  // const stabilityFee = Math.pow(r, 365 * 24 * 60 * 60);

  // In Wei
  expect(parseInt(openVaultState.borrowed.toString())).toBeCloseTo(
    parseInt(flashloanDaiAmount.toString()),
    10
  );

  // Close CDP
  const closeCalldata = CloseShortDAIActions.interface.encodeFunctionData(
    "flashloanAndClose",
    [
      CloseShortDAI.address,
      CONTRACT_ADDRESSES.ISoloMargin,
      CONTRACT_ADDRESSES.CurveFiSUSDv2,
      newCdpId,
      ethers.utils.parseUnits("1", ERC20_DECIMALS.DAI),
      ethers.utils.parseUnits("5", ERC20_DECIMALS.USDC), // Withdraw amount must be able to repay flashloan
    ]
  );

  const closeTx = await IDSProxy[
    "execute(address,bytes)"
  ](CloseShortDAIActions.address, closeCalldata, { gasLimit: 1000000 });
  await closeTx.wait();

  const closeVaultState = await VaultPositionReader.getVaultStats(newCdpId);

  // In Wei
  expect(parseInt(closeVaultState.borrowed.toString())).toBeLessThan(
    parseInt(openVaultState.borrowed.toString())
  );
});

test("open short for existing vault", async function () {
  const oldCdpIdRaw = await IDssCdpManager.last(IDSProxy.address);
  const oldCdpId = parseInt(oldCdpIdRaw.toString(), 10);

  await IDssCdpManager.open(
    ethers.utils.formatBytes32String("USDC-A"),
    IDSProxy.address
  );

  const newCdpIdRaw = await IDssCdpManager.last(IDSProxy.address);
  const newCdpId = parseInt(newCdpIdRaw.toString(), 10);
  expect(newCdpId).toBeGreaterThan(oldCdpId);

  const initialVaultState = await VaultPositionReader.getVaultStats(newCdpId);
  expect(parseInt(initialVaultState.borrowed.toString())).toBeCloseTo(0, 10);

  // Leverage short
  const flashloanDaiAmount = ethers.utils.parseUnits("20", ERC20_DECIMALS.DAI);
  const initialUsdcMargin = ethers.utils.parseUnits("50", ERC20_DECIMALS.USDC);

  await swapOnOneSplit(user, {
    fromToken: ETH_ADDRESS,
    toToken: ERC20_ADDRESSES.USDC,
    amountWei: ethers.utils.parseUnits("1"),
  });
  await USDC.approve(IDSProxy.address, initialUsdcMargin);

  const openCalldata = OpenShortDAIActions.interface.encodeFunctionData(
    "flashloanAndOpen",
    [
      OpenShortDAI.address,
      CONTRACT_ADDRESSES.ISoloMargin,
      CONTRACT_ADDRESSES.CurveFiSUSDv2,
      newCdpId,
      initialUsdcMargin,
      flashloanDaiAmount,
    ]
  );

  const openTx = await IDSProxy[
    "execute(address,bytes)"
  ](OpenShortDAIActions.address, openCalldata, { gasLimit: 1000000 });
  await openTx.wait();

  const newVaultState = await VaultPositionReader.getVaultStats(newCdpId);
  expect(parseInt(newVaultState.borrowed.toString())).toBeCloseTo(
    parseInt(flashloanDaiAmount.toString()),
    10
  );
});
