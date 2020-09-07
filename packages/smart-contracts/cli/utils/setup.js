const { ethers } = require("ethers");
const { CONTRACT_ADDRESSES } = require("./constants");

const setupContract = async ({
  signer, // Signer to connect to
  wallets, // Array of ethers.js wallets
  address,
  name,
}) => {
  const { abi, bytecode } = require(`../../artifacts/${name}.json`);

  if (!abi || !bytecode) {
    throw new Error(
      `ABI/Bytecode not found for artifact ${name}!. Try running 'yarn compile' first!`
    );
  }

  const selectedAddress = address || CONTRACT_ADDRESSES[name];

  // If no address specified, then we're deploying a new contract
  if (!selectedAddress) {
    const deployer = wallets[0];
    const nonce = await deployer.getTransactionCount();

    const factory = new ethers.ContractFactory(abi, bytecode, deployer);
    const contract = await factory.deploy({
      nonce,
      gasPrice: ethers.BigNumber.from('110000000000'),
    });
    await contract.deployTransaction.wait(1);

    return new ethers.Contract(contract.address, abi).connect(signer);
  }

  return new ethers.Contract(selectedAddress, abi).connect(signer);
};

const setupIDSProxy = async ({ user }) => {
  // Get MakerDAO's proxy registry
  const IProxyRegistry = await setupContract({
    signer: user,
    name: "IProxyRegistry",
  });

  let proxyAddress = await IProxyRegistry.proxies(user.address);
  if (proxyAddress === ethers.constants.AddressZero) {
    await IProxyRegistry["build(address)"](user.address);
    proxyAddress = await IProxyRegistry.proxies(user.address);
  }

  const { abi } = require(`../../artifacts/IDSProxy.json`);

  return new ethers.Contract(proxyAddress, abi).connect(user);
};

module.exports = { setupContract, setupIDSProxy };
