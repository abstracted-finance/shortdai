const ethers = require("ethers");

const { ETH_ADDRESS } = require("../cli/utils/constants");
const { setupContract } = require("../cli/utils/setup");

const DEFAULT_PROVIDER = "http://localhost:8545";
const DEFAULT_MNEMONIC =
  "myth like bonus scare over problem client lizard pioneer submit female collect";

const provider = new ethers.providers.JsonRpcProvider(
  process.env.PROVIDER_URL || DEFAULT_PROVIDER
);
const wallets = Array(10)
  .fill(0)
  .map((_, i) =>
    ethers.Wallet.fromMnemonic(
      process.env.MNEMONIC || DEFAULT_MNEMONIC,
      `m/44'/60'/0'/0/${i}`
    ).connect(provider)
  );

const swapOnOneSplit = async (
  wallet,
  { fromToken, toToken, amountWei },
  options = {}
) => {
  const IOneSplit = (
    await setupContract({ wallets, name: "IOneSplit" })
  ).connect(wallet);

  const flags = 0;
  const parts = 2;

  const { distribution } = await IOneSplit.getExpectedReturn(
    fromToken,
    toToken,
    amountWei,
    parts,
    flags
  );

  const tx = await IOneSplit.swap(
    fromToken,
    toToken,
    amountWei,
    0,
    distribution,
    flags,
    {
      gasLimit: 1000000,
      ...options,
      value: fromToken === ETH_ADDRESS ? amountWei : 0,
    }
  );
  const txRecp = await tx.wait();

  return txRecp;
};

module.exports = {
  wallets,
  provider,
  swapOnOneSplit,
};
