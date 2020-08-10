import { ethers } from "ethers";
import { getContract, CONSTANTS } from "@shortdai/smart-contracts";
import { BotContracts } from "./types";

const { CONTRACT_ADDRESSES } = CONSTANTS;

export const getContracts = (
  wallet: ethers.Wallet,
  network: string
): BotContracts => {
  const initialNoAddressContractNames = ["IERC20", "IDSProxy", "ICurveFiCurve"];

  const initialNoAddressContracts = initialNoAddressContractNames
    .map((name) => {
      const { abi } = getContract({ name });
      const c = new ethers.Contract(ethers.constants.AddressZero, abi);

      return [name, c];
    })
    .reduce((acc, [k, v]: [string, ethers.Contract]) => {
      return { ...acc, [k]: v };
    }, {});

  // Contracts with manual address
  const initialManualAddressContractsConfig = [
    { name: "IOneSplit", address: CONTRACT_ADDRESSES.IOneSplit },
    {
      name: "IProxyRegistry",
      address: CONTRACT_ADDRESSES.IProxyRegistry,
    },
  ];
  const initialManualAddressContracts = initialManualAddressContractsConfig
    .map(({ name, address }) => {
      const { abi } = getContract({ name });
      const c = new ethers.Contract(address, abi);

      return [name, c];
    })
    .reduce((acc, [k, v]: [string, ethers.Contract]) => {
      return { ...acc, [k]: v };
    }, {});

  // Contracts is being deployed by our deploy system
  const initialAddressedContractNames = [
    "OpenShortDAI",
    "CloseShortDAI",
    "OpenShortDAIActions",
    "CloseShortDAIActions",
    "VaultPositionReader",
  ];
  const initialAddressedContracts = initialAddressedContractNames
    .map((name) => {
      const { abi, address } = getContract({
        name,
        network,
      });
      const c = new ethers.Contract(address, abi);

      return [name, c];
    })
    .reduce((acc, [k, v]: [string, ethers.Contract]) => {
      return { ...acc, [k]: v };
    }, {});

  const contracts = {
    ...initialNoAddressContracts,
    ...initialManualAddressContracts,
    ...initialAddressedContracts,
  };

  const contractsWithWallet = Object.keys(contracts)
    .map((k) => {
      return [k, contracts[k].connect(wallet)];
    })
    .reduce((acc, [k, v]: [string, ethers.Contract]) => {
      return { ...acc, [k]: v };
    }, {});

  return contractsWithWallet as BotContracts;
};
