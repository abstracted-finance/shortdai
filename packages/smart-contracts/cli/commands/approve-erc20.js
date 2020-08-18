const { ethers } = require("ethers");
const chalk = require("chalk");

const { setupContract } = require("../utils/setup");
const { CONTRACT_ADDRESSES } = require("../utils/constants");

async function approveERC20({
  privateKey,
  token,
  recipient,
  amountWei,
  proxy,
  host,
}) {
  const provider = new ethers.providers.JsonRpcProvider(host);
  const wallet = new ethers.Wallet(privateKey, provider);

  const IProxyRegistry = (
    await setupContract({
      name: "IProxyRegistry",
      address: CONTRACT_ADDRESSES.IProxyRegistry,
    })
  ).connect(wallet);

  const IERC20 = (
    await setupContract({ name: "IERC20", address: token })
  ).connect(wallet);

  let recipientFixed;

  if (proxy) {
    console.log(
      chalk.yellowBright(`Finding proxy address for ${wallet.address}`)
    );
    recipientFixed = await IProxyRegistry.proxies(wallet.address);
  } else {
    recipientFixed = recipient;
  }

  console.log(chalk.gray(`Host: ${host}`));
  console.log(
    chalk.yellowBright(
      `Approving ${amountWei} amount of token ${token} to ${recipientFixed}`
    )
  );

  await IERC20.approve(recipientFixed, amountWei);
}

module.exports = {
  approveERC20,
  cmd: (program) =>
    program
      .command("approve-erc20")
      .description("Approves ERC20")
      .option("-r, --recipient <value>", "Address of recipient")
      .option(
        "-p, --proxy",
        "If supplied, will ignore recipient value and get proxy account"
      )
      .option(
        "-k, --private-key <value>",
        "Private key",
        "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"
      )
      .requiredOption("-t, --token <value>", "Token to approve")
      .requiredOption("-w, --amountWei <value>", "Amount of wei to approve")
      .option(
        "-h, --host <value>",
        "JsonRpcURL hostname",
        "http://localhost:8545"
      )
      .action(approveERC20),
};
