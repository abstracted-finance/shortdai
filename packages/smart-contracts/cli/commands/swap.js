const { ethers } = require("ethers");
const ora = require("ora");
const chalk = require("chalk");

const { setupContract } = require("../utils/setup");

async function swap({ privateKey, amountWei, fromToken, toToken, host }) {
  const provider = new ethers.providers.JsonRpcProvider(host);
  const user = new ethers.Wallet(privateKey, provider);

  const IOneSplit = (
    await setupContract({ name: "IOneSplit" })
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
        "-k, --private-key <value>",
        "Private key",
        "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"
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
