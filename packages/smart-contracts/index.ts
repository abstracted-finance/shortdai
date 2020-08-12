import { ethers } from "ethers";

import CONSTANTS from "./cli/utils/constants";

const { CONTRACT_ADDRESSES } = CONSTANTS;

export interface Contract {
  abi: any;
  address?: string;
}

export interface EthersContracts {
  IERC20: ethers.Contract;
  IDSProxy: ethers.Contract;
  IOneSplit: ethers.Contract;
  ICurveFiCurve: ethers.Contract;
  IProxyRegistry: ethers.Contract;
  IDssCdpManager: ethers.Contract;
  VatLike: ethers.Contract;
  OpenShortDAI: ethers.Contract;
  CloseShortDAI: ethers.Contract;
  ShortDAIActions: ethers.Contract;
  VaultPositionReader: ethers.Contract;
}

export const getContract = ({
  network,
  name,
}: {
  network?: string;
  name: string;
}): Contract => {
  if (!network) {
    const { abi } = require(`${__dirname}/artifacts/${name}.json`);
    return { abi };
  }

  const deployed = require(`${__dirname}/deployed/${network}/deployed.json`);
  const { abi, address } = deployed[name];

  return {
    abi,
    address,
  };
};

export const getEthersContracts = (
  network: string,
  signerOrProvider: ethers.Signer | ethers.providers.BaseProvider
): EthersContracts => {
  const initialNoAddressContractNames = [
    "IERC20",
    "IDSProxy",
    "ICurveFiCurve",
    "VatLike",
  ];

  const initialNoAddressContracts = initialNoAddressContractNames
    .map((name) => {
      const { abi } = getContract({ name, network: null });
      const c = new ethers.Contract(
        ethers.constants.AddressZero,
        abi,
        signerOrProvider
      );

      return [name, c];
    })
    .reduce((acc, [k, v]: [string, ethers.Contract]) => {
      return { ...acc, [k]: v };
    }, {});

  // Contracts with manual address
  const initialManualAddressContractsConfig = [
    { name: "IOneSplit", address: CONTRACT_ADDRESSES.IOneSplit },
    { name: "IDssCdpManager", address: CONTRACT_ADDRESSES.IDssCdpManager },
    {
      name: "IProxyRegistry",
      address: CONTRACT_ADDRESSES.IProxyRegistry,
    },
  ];
  const initialManualAddressContracts = initialManualAddressContractsConfig
    .map(({ name, address }) => {
      const { abi } = getContract({ name, network: null });
      const c = new ethers.Contract(address, abi, signerOrProvider);

      return [name, c];
    })
    .reduce((acc, [k, v]: [string, ethers.Contract]) => {
      return { ...acc, [k]: v };
    }, {});

  // Contracts is being deployed by our deploy system
  const initialAddressedContractNames = [
    "OpenShortDAI",
    "CloseShortDAI",
    "ShortDAIActions",
    "VaultPositionReader",
  ];
  const initialAddressedContracts = initialAddressedContractNames
    .map((name) => {
      const { abi, address } = getContract({
        name,
        network,
      });
      const c = new ethers.Contract(address, abi, signerOrProvider);

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

  return contracts as EthersContracts;
};

export { CONSTANTS };
