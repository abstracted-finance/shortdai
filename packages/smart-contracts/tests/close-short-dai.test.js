const ethers = require("ethers");

const {
  ERC20_ADDRESSES,
  ETH_ADDRESS,
  CONTRACT_ADDRESSES,
  ERC20_DECIMALS,
} = require("../cli/utils/constants");

const { setupContract, setupIDSProxy } = require("../cli/utils/setup");

const { swapOnOneSplit, wallets } = require("./common");

let CloseShortDAIActions;
let CloseShortDAI;
let IDSProxy;
let USDC;
let DAI;

const user = wallets[2];

beforeAll(async function () {
  try {
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

test("close short dai position", async function () {
  const withdrawAmount = ethers.utils.parseUnits("30", ERC20_DECIMALS.USDC);
  const flashloanAmount = ethers.utils.parseEther("20", ERC20_DECIMALS.DAI);

  await swapOnOneSplit(user, {
    fromToken: ETH_ADDRESS,
    toToken: ERC20_ADDRESSES.DAI,
    amountWei: ethers.utils.parseUnits("1"),
  });
  // So contract has enough funds
  await DAI.transfer(CloseShortDAI.address, 2);

  await CloseShortDAI.flashloanAndClose(
    user.address,
    CONTRACT_ADDRESSES.ISoloMargin,
    CONTRACT_ADDRESSES.CurveFiSUSDv2,
    flashloanAmount,
    withdrawAmount,
    0,
    { gasLimit: 5000000 }
  );

  //   const calldata = CloseShortDAIActions.interface.encodeFunctionData(
  //     "flashloanAndClose",
  //     [
  //       CloseShortDAI.address,
  //       CONTRACT_ADDRESSES.ISoloMargin,
  //       CONTRACT_ADDRESSES.CurveFiSUSDv2,
  //       flashloanAmount,
  //       withdrawAmount,
  //       0,
  //     ]
  //   );

  //   const tx = await IDSProxy[
  //     "execute(address,bytes)"
  //   ](CloseShortDAIActions.address, calldata, { gasLimit: 5000000 });
  //   await tx.wait();
});
