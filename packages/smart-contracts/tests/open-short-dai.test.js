const ethers = require("ethers");

const {
  ERC20_ADDRESSES,
  ETH_ADDRESS,
  CONTRACT_ADDRESSES,
  ERC20_DECIMALS,
} = require("../cli/utils/constants");

const { setupContract, setupIDSProxy } = require("../cli/utils/setup");

const { swapOnOneSplit, wallets } = require("./common");

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

test("leveraged short dai", async function () {
  const flashloanAmount = ethers.utils.parseUnits("1", ERC20_DECIMALS.USDC);
  const initialMargin = ethers.utils.parseUnits("50", ERC20_DECIMALS.USDC);
  const borrowAmount = ethers.utils.parseEther("20", ERC20_DECIMALS.DAI);

  await swapOnOneSplit(user, {
    fromToken: ETH_ADDRESS,
    toToken: ERC20_ADDRESSES.USDC,
    amountWei: ethers.utils.parseUnits("10"),
  });
  await USDC.approve(IDSProxy.address, initialMargin);

  const calldata = OpenShortDAIActions.interface.encodeFunctionData(
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

  const tx = await IDSProxy[
    "execute(address,bytes)"
  ](OpenShortDAIActions.address, calldata, { gasLimit: 5000000 });
  await tx.wait();

  // TODO: Write USDC Tests
});
