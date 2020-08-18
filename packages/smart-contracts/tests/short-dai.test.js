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
let VatLike;
let USDC;

const user = wallets[2];

beforeAll(async function () {
  try {
    VatLike = await setupContract({
      signer: user,
      wallets,
      name: "VatLike",
      address: ethers.constants.AddressZero,
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

const getCdpBorrowedSuppied = async (cdpId) => {
  const vat = await IDssCdpManager.vat();
  const urn = await IDssCdpManager.urns(cdpId);
  const ilk = await IDssCdpManager.ilks(cdpId);
  const owner = await IDssCdpManager.owns(cdpId);

  const IVatLike = VatLike.attach(vat);

  const [_, rate] = await IVatLike.ilks(ilk);
  const [supplied, art] = await IVatLike.urns(ilk, urn);
  const dai = await IVatLike.dai(owner);

  const RAY = ethers.utils.parseUnits("1", 27);
  const rad = art.mul(rate).sub(dai);
  const wad = rad.div(RAY);

  const borrowed = wad.mul(RAY).lt(rad)
    ? wad.add(ethers.BigNumber.from(1))
    : wad;

  return {
    borrowed,
    supplied,
  };
};

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

  const openCalldata = ShortDAIActions.interface.encodeFunctionData(
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
  ](ShortDAIActions.address, openCalldata, { gasLimit: 1200000 });
  await openTx.wait();

  // Gets cdpId
  const newCdpId = await IDssCdpManager.last(IDSProxy.address);
  expect(newCdpId).not.toEqual(initialCdpId);

  // Makes sure vault debt is equal to borrowedDaiAmount
  const openVaultState = await getCdpBorrowedSuppied(newCdpId);

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

  const closeVaultState = await getCdpBorrowedSuppied(newCdpId);

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

  const initialVaultState = await getCdpBorrowedSuppied(newCdpId);
  expect(parseInt(initialVaultState.borrowed.toString())).toBeCloseTo(0, 10);

  // Leverage short
  const flashloanDaiAmount = ethers.utils.parseUnits("30", ERC20_DECIMALS.DAI);
  const initialUsdcMargin = ethers.utils.parseUnits("100", ERC20_DECIMALS.USDC);

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
      newCdpId,
      initialUsdcMargin,
      flashloanDaiAmount,
    ]
  );

  const openTx = await IDSProxy[
    "execute(address,bytes)"
  ](ShortDAIActions.address, openCalldata, { gasLimit: 1000000 });
  await openTx.wait();

  const newVaultState = await getCdpBorrowedSuppied(newCdpId);
  expect(parseInt(newVaultState.borrowed.toString())).toBeCloseTo(
    parseInt(flashloanDaiAmount.toString()),
    10
  );
});
