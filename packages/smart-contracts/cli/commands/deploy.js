const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");
const ora = require("ora");
const chalk = require("chalk");

const { setupContract } = require("../utils/setup");

const deploymentConfigFilename = "config.json";
const deployedFilename = "deployed.json";

const bre = require("@nomiclabs/buidler");

async function deploy({
  recompile,
  runs,
  mnemonic,
  host,
  deployedDirectory,
  toggleDeploy,
}) {
  console.log(chalk.grey(`Deploying via host: ${host}`));

  if (runs !== 0) {
    bre.config.solc.optimizer = { enabled: true, runs: parseInt(runs) };
    console.log(chalk.yellow(`Optimizer enabled with ${runs} runs`));
  }

  if (recompile) {
    console.log(chalk.yellow(`Contracts will be re-compiled before deploying`));
    await bre.run("compile", { force: true });
  }

  const provider = new ethers.providers.JsonRpcProvider(host);
  const wallets = Array(10)
    .fill(0)
    .map((_, i) =>
      ethers.Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${i}`).connect(
        provider
      )
    );

  const absoluteDeployedDirectory = path.join(process.cwd(), deployedDirectory);

  // Deployed.json
  const deployedFilePath = path.resolve(
    absoluteDeployedDirectory,
    deployedFilename
  );

  // Config.json
  const deploymentConfigFilePath = path.resolve(
    absoluteDeployedDirectory,
    deploymentConfigFilename
  );

  // Create deployedFile if doesn't exists
  if (!fs.existsSync(deployedFilePath)) {
    fs.writeFileSync(deployedFilePath, "{}");
  }

  // Get deployments needed
  const deploymentConfig = JSON.parse(
    fs.readFileSync(deploymentConfigFilePath, "utf8")
  );
  const updatedDeploymentConfig = { ...deploymentConfig };

  // Get deployed
  const deployedConfig = JSON.parse(fs.readFileSync(deployedFilePath, "utf8"));

  // Deploys each contract
  for (const contractName in deploymentConfig) {
    if (deploymentConfig[contractName].deploy) {
      // Display deploying info
      const spinner = ora(`Deploying ${contractName}`).start();

      // Deploy contract
      const deployedContract = await setupContract({
        wallets,
        name: contractName,
      });

      // Display success
      spinner.succeed(
        chalk.green(`Deployed ${contractName} to ${deployedContract.address}`)
      );

      // Write to config.json
      if (toggleDeploy) {
        updatedDeploymentConfig[contractName].deploy = false;
        fs.writeFileSync(
          deploymentConfigFilePath,
          JSON.stringify(updatedDeploymentConfig, null, 4)
        );
      }

      const { abi } = require(`../../artifacts/${contractName}.json`);

      if (!abi) {
        throw new Error(`Unable to find abi for contract ${contractName}`);
      }

      // Write to deployed.json
      deployedConfig[contractName] = {
        address: deployedContract.address,
        abi,
      };
      fs.writeFileSync(
        deployedFilePath,
        JSON.stringify(deployedConfig, null, 4)
      );
    }
  }
}

module.exports = {
  deploy,
  cmd: (program) =>
    program
      .command("deploy")
      .description("Deploys contracts")
      .option("-t, --toggle-deploy", "Toggles 'deploy' value in config.json")
      .option(
        "-m, --mnemonic <value>",
        "Mnemonic key",
        "myth like bonus scare over problem client lizard pioneer submit female collect"
      )
      .option(
        "-r, --runs <value>",
        "Recompiles contract with <x> optimizer runs",
        0
      )
      .option("-c, --recompile", "Recompiles contract before deploying")
      .option(
        "-h, --host <value>",
        "JsonRpcURL hostname",
        "http://localhost:8545"
      )
      .requiredOption(
        "-d, --deployed-directory <value>",
        "Deployed directory. Contains config.json."
      )
      .action(deploy),
};
