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
    IDSProxy = await setupIDSProxy({ user });
  } catch (e) {
    console.log(e);
  }
});

test("open and close short dai position", async function () {
  const flashloanAmount = ethers.utils.parseUnits("1", ERC20_DECIMALS.USDC);
  const initialMargin = ethers.utils.parseUnits("50", ERC20_DECIMALS.USDC);
  const borrowAmount = ethers.utils.parseEther("20", ERC20_DECIMALS.DAI);

  await swapOnOneSplit(user, {
    fromToken: ETH_ADDRESS,
    toToken: ERC20_ADDRESSES.USDC,
    amountWei: ethers.utils.parseUnits("1"),
  });
  await USDC.approve(IDSProxy.address, initialMargin);

  const openCalldata = OpenShortDAIActions.interface.encodeFunctionData(
    "flashloanAndShort",
    [
      OpenShortDAI.address,
      CONTRACT_ADDRESSES.ISoloMargin,
      CONTRACT_ADDRESSES.CurveFiSUSDv2,
      initialMargin,
      flashloanAmount,
      borrowAmount,
      0,
    ]
  );

  const openTx = await IDSProxy[
    "execute(address,bytes)"
  ](OpenShortDAIActions.address, openCalldata, { gasLimit: 5000000 });
  await openTx.wait();

  // Gets cdpId
  const cdpId = await IDssCdpManager.last(IDSProxy.address);

  // Close CDP
  const flashloanAmountDAI = ethers.utils.parseUnits("20", ERC20_DECIMALS.DAI);
  const withdrawAmountUSDC = ethers.utils.parseUnits("50", ERC20_DECIMALS.USDC);

  await swapOnOneSplit(user, {
    fromToken: ETH_ADDRESS,
    toToken: ERC20_ADDRESSES.DAI,
    amountWei: flashloanAmountDAI.add(ethers.BigNumber.from(2)),
  });

  const closeCalldata = CloseShortDAIActions.interface.encodeFunctionData(
    "flashloanAndClose",
    [
      CloseShortDAI.address,
      CONTRACT_ADDRESSES.ISoloMargin,
      CONTRACT_ADDRESSES.CurveFiSUSDv2,
      flashloanAmountDAI,
      withdrawAmountUSDC,
      cdpId,
    ]
  );

  const closeTx = await IDSProxy[
    "execute(address,bytes)"
  ](CloseShortDAIActions.address, closeCalldata, { gasLimit: 5000000 });
  await closeTx.wait();
});
