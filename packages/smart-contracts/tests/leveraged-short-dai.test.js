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
let LeveragedShortDAIActions;
let LeveragedShortDAI;
let IDSProxy;
let USDC;

const user = wallets[2];

beforeAll(async function () {
  try {
    LeveragedShortDAIActions = await setupContract({
      signer: user,
      wallets,
      name: "LeveragedShortDAIActions",
    });
    LeveragedShortDAI = await setupContract({
      signer: user,
      wallets,
      name: "LeveragedShortDAI",
    });
    USDC = await setupContract({
      signer: user,
      wallets,
      name: "IERC20",
      address: ERC20_ADDRESSES.USDC,
    });
    IDssCdpManager = await setupContract({
      signer: user,
      wallets,
      name: "IDssCdpManager",
    });
    IDSProxy = await setupIDSProxy({ user });
  } catch (e) {
    console.log(e);
  }
});

test("leverage short dai", async function () {
  const flashloanAmount = ethers.utils.parseUnits("1", ERC20_DECIMALS.USDC);
  const initialMargin = ethers.utils.parseUnits("50", ERC20_DECIMALS.USDC);
  const borrowAmount = ethers.utils.parseEther("20", ERC20_DECIMALS.DAI);

  await swapOnOneSplit(user, {
    fromToken: ETH_ADDRESS,
    toToken: ERC20_ADDRESSES.USDC,
    amountWei: ethers.utils.parseUnits("10"),
  });
  await USDC.approve(IDSProxy.address, initialMargin);

  // Just so contract has funds to repay lol
  await USDC.transfer(
    LeveragedShortDAI.address,
    flashloanAmount.add(ethers.BigNumber.from(2))
  );

  const calldata = LeveragedShortDAIActions.interface.encodeFunctionData(
    "flashloanAndShort",
    [
      CONTRACT_ADDRESSES.ISoloMargin,
      LeveragedShortDAI.address,
      initialMargin,
      flashloanAmount,
      borrowAmount,
      0,
    ]
  );

  const tx = await IDSProxy[
    "execute(address,bytes)"
  ](LeveragedShortDAIActions.address, calldata, { gasLimit: 5000000 });
  await tx.wait();
});
