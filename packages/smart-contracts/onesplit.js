const { ethers } = require("ethers");
const { provider, wallets, swapOnOneSplit } = require("./tests/common");
const { setupContract } = require("./cli/utils/setup");
const {
  CONTRACT_ADDRESSES,
  ERC20_ADDRESSES,
  ETH_ADDRESS,
} = require("./cli/utils/constants");

const user = wallets[1];

const main = async () => {
  const OneSplit = (
    await setupContract({
      name: "IOneSplit",
      wallets,
      signer: user,
      address: CONTRACT_ADDRESSES.IOneSplit,
    })
  ).connect(user);

  const DAI = (
    await setupContract({
      name: "IERC20",
      wallets,
      signer: user,
      address: ERC20_ADDRESSES.DAI,
    })
  ).connect(user);

  await swapOnOneSplit(user, {
    fromToken: ETH_ADDRESS,
    toToken: ERC20_ADDRESSES.DAI,
    amountWei: ethers.utils.parseEther("100"),
  });

  const { returnAmount, distribution } = await OneSplit.getExpectedReturn(
    ERC20_ADDRESSES.DAI,
    ERC20_ADDRESSES.USDC,
    ethers.utils.parseUnits("10000", 18),
    10,
    3758411776
  );

  await DAI.approve(OneSplit.address, ethers.constants.MaxUint256);
  await OneSplit.swap(
    ERC20_ADDRESSES.DAI,
    ERC20_ADDRESSES.USDC,
    ethers.utils.parseUnits("10000", 18),
    0,
    distribution,
    3758411776,
  );

  console.log("returnAmount", returnAmount.toString());
  console.log("distribution", distribution);
  console.log(
    "usdc balance",
    (await DAI.attach(ERC20_ADDRESSES.USDC).balanceOf(user.address)).toString()
  );
};

main();
