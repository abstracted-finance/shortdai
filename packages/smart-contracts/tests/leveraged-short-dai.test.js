const ethers = require("ethers");

const {
  ERC20_ADDRESSES,
  ETH_ADDRESS,
  CONTRACT_ADDRESSES,
} = require("../cli/utils/constants");

const { setupContract, setupIDSProxy } = require("../cli/utils/setup");

const { swapOnOneSplit, wallets } = require("./common");

let LeveragedShortDAIActions;
let LeveragedShortDAI;
let IDSProxy;
let DAI;

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

test("leverage short dai", async function () {
  const token = ERC20_ADDRESSES.DAI;
  const amount = ethers.utils.parseEther("10");

  await swapOnOneSplit(user, {
    fromToken: ETH_ADDRESS,
    toToken: token,
    amountWei: ethers.utils.parseEther("1"),
  });

  await DAI.transfer(LeveragedShortDAI.address, 10);

  const calldata = LeveragedShortDAIActions.interface.encodeFunctionData(
    "flashloanAndShort",
    [
      LeveragedShortDAI.address,
      CONTRACT_ADDRESSES.ISoloMargin,
      token,
      amount,
      0,
    ]
  );

  const tx = await IDSProxy[
    "execute(address,bytes)"
  ](LeveragedShortDAIActions.address, calldata, { gasLimit: 5000000 });
  await tx.wait();
});
