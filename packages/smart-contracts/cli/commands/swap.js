const { ethers } = require("ethers");
const ora = require("ora");
const chalk = require("chalk");

const { setupContract } = require("../utils/setup");

async function swap({ mnemonic, amountWei, fromToken, toToken, host }) {
  const provider = new ethers.providers.JsonRpcProvider(host);
  const wallets = Array(10)
    .fill(0)
    .map((_, i) =>
      ethers.Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${i}`).connect(
        provider
      )
    );

  const [user] = wallets;

  const IOneSplit = (
    await setupContract({ wallets, name: "IOneSplit" })
  ).connect(user);

  const flags = 0;
  const parts = 2;

  console.log(chalk.grey(`Swapping tokens for user ${user.address}`));
  console.log(chalk.grey(`From ${fromToken} to ${toToken}`));
  const spinnerGetExpectedReturn = ora(`Querying getExpectedReturn`).start();

  const { returnAmount, distribution } = await IOneSplit.getExpectedReturn(
    fromToken,
    toToken,
    amountWei,
    parts,
    flags
  );

  spinnerGetExpectedReturn.succeed(
    chalk.green(`getExpectedReturn (in Wei) ${returnAmount}`)
  );

  console.log(chalk.grey(`From ${fromToken} to ${toToken}`));

  const isEthAddress =
    fromToken.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
    fromToken === ethers.constants.AddressZero;

  const spinnerSwap = ora(`Swapping tokens`).start();

  const tx = await IOneSplit.swap(
    fromToken,
    toToken,
    amountWei,
    returnAmount,
    distribution,
    flags,
    {
      gasLimit: 1000000,
      value: isEthAddress ? amountWei : 0,
    }
  );
  const txRecp = await tx.wait();

  spinnerSwap.succeed(
    chalk.green(
      `Swapped ${amountWei} (${fromToken}) to ${returnAmount} (${toToken})`
    )
  );

  return txRecp;
}

module.exports = {
  swap,
  cmd: (program) =>
    program
      .command("swap")
      .description("Swaps tokens on 1inch")
      .option(
        "-m, --mnemonic <value>",
        "Mnemonic key",
        "myth like bonus scare over problem client lizard pioneer submit female collect"
      )
      .requiredOption("-f, --fromToken <value>", "Address of fromToken")
      .requiredOption(
        "-w, --amountWei <value>",
        "Amount of fromToken to swap, in Wei"
      )
      .requiredOption("-t, --toToken <value>", "Address of toToken")
      .option(
        "-h, --host <value>",
        "JsonRpcURL hostname",
        "http://localhost:8545"
      )
      .action(swap),
};
