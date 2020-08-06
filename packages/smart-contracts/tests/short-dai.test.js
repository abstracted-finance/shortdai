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

test("open short for existing vault", async function () {
  const oldCdpId = await IDssCdpManager.last(IDSProxy.address);

  await IDssCdpManager.open(
    ethers.utils.formatBytes32String("USDC-A"),
    IDSProxy.address
  );

  const newCdpId = await IDssCdpManager.last(IDSProxy.address);
  expect(newCdpId).toBeGreaterThan(oldCdpId);

  const initialVaultState = await VaultPositionReader.getVaultStats(newCdpId);
  expect(parseInt(initialVaultState.debt.toString())).toBeCloseTo(0, 10);

  // Leverage short
  const flashloanUsdcAmount = ethers.utils.parseUnits("1", ERC20_DECIMALS.USDC);
  const initialUsdcMargin = ethers.utils.parseUnits("50", ERC20_DECIMALS.USDC);
  const borrowDaiAmount = ethers.utils.parseEther("20", ERC20_DECIMALS.DAI);

  await swapOnOneSplit(user, {
    fromToken: ETH_ADDRESS,
    toToken: ERC20_ADDRESSES.USDC,
    amountWei: ethers.utils.parseUnits("1"),
  });
  await USDC.approve(IDSProxy.address, initialUsdcMargin);

  const openCalldata = OpenShortDAIActions.interface.encodeFunctionData(
    "flashloanAndShort",
    [
      OpenShortDAI.address,
      CONTRACT_ADDRESSES.ISoloMargin,
      CONTRACT_ADDRESSES.CurveFiSUSDv2,
      initialUsdcMargin,
      flashloanUsdcAmount,
      borrowDaiAmount,
      newCdpId,
    ]
  );

  const openTx = await IDSProxy[
    "execute(address,bytes)"
  ](OpenShortDAIActions.address, openCalldata, { gasLimit: 1000000 });
  await openTx.wait();

  const newVaultState = await VaultPositionReader.getVaultStats(newCdpId);
  expect(parseInt(newVaultState.debt.toString())).toBeCloseTo(
    parseInt(borrowDaiAmount.toString()),
    10
  );
});

test("open and close short (new) vault position", async function () {
  // Initial cdpId
  const initialCdpId = await IDssCdpManager.last(IDSProxy.address);

  // Open parameters
  const flashloanUsdcAmount = ethers.utils.parseUnits("1", ERC20_DECIMALS.USDC);
  const initialUsdcMargin = ethers.utils.parseUnits("50", ERC20_DECIMALS.USDC);
  const borrowDaiAmount = ethers.utils.parseEther("20", ERC20_DECIMALS.DAI);

  await swapOnOneSplit(user, {
    fromToken: ETH_ADDRESS,
    toToken: ERC20_ADDRESSES.USDC,
    amountWei: ethers.utils.parseUnits("1"),
  });
  await USDC.approve(IDSProxy.address, initialUsdcMargin);

  const openCalldata = OpenShortDAIActions.interface.encodeFunctionData(
    "flashloanAndShort",
    [
      OpenShortDAI.address,
      CONTRACT_ADDRESSES.ISoloMargin,
      CONTRACT_ADDRESSES.CurveFiSUSDv2,
      initialUsdcMargin,
      flashloanUsdcAmount,
      borrowDaiAmount,
      0,
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

  // Example on calculating stability rates
  // https://docs.makerdao.com/smart-contract-modules/rates-module
  // const RAY = ethers.BigNumber.from("1000000000000000000000000000");
  // const r = parseFloat(openVaultState.duty) / parseFloat(RAY);
  // const stabilityFee = Math.pow(r, 365 * 24 * 60 * 60);

  // In Wei
  expect(parseInt(openVaultState.debt.toString())).toBeCloseTo(
    parseInt(borrowDaiAmount.toString()),
    10
  );

  // Close CDP
  const flashloanDaiAmount = ethers.utils.parseUnits("20", ERC20_DECIMALS.DAI);
  const withdrawUsdcAmount = ethers.utils.parseUnits("50", ERC20_DECIMALS.USDC);

  await swapOnOneSplit(user, {
    fromToken: ETH_ADDRESS,
    toToken: ERC20_ADDRESSES.DAI,
    amountWei: ethers.utils.parseUnits("1"),
  });

  const closeCalldata = CloseShortDAIActions.interface.encodeFunctionData(
    "flashloanAndClose",
    [
      CloseShortDAI.address,
      CONTRACT_ADDRESSES.ISoloMargin,
      CONTRACT_ADDRESSES.CurveFiSUSDv2,
      flashloanDaiAmount,
      withdrawUsdcAmount,
      newCdpId,
    ]
  );

  const closeTx = await IDSProxy[
    "execute(address,bytes)"
  ](CloseShortDAIActions.address, closeCalldata, { gasLimit: 1000000 });
  await closeTx.wait();

  const closeVaultState = await VaultPositionReader.getVaultStats(newCdpId);
  // In Wei
  expect(parseInt(closeVaultState.debt.toString())).toBeCloseTo(0, 10);
});
