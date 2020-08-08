import { createContainer } from "unstated-next";
import { useEffect, useState } from "react";
import { ethers } from "ethers";

import useWeb3 from "./use-web3";
import { CONSTANTS } from "@shortdai/smart-contracts";

const getContract = ({ network, name }) => {
  if (!network) {
    const { abi } = require(`@shortdai/smart-contracts/artifacts/${name}.json`);
    return { abi };
  }

  const deployed = require(`@shortdai/smart-contracts/deployed/${network}/deployed.json`);
  const { abi, address } = deployed[name];

  return {
    abi,
    address,
  };
};

const network = "localhost";

// Contracts that has dynamic address
const initialNoAddressContractNames = ["IERC20", "IDSProxy"];
const initialNoAddressContracts = initialNoAddressContractNames
  .map((name) => {
    const { abi } = getContract({ name });
    const c = new ethers.Contract(ethers.constants.AddressZero, abi);

    return [name, c];
  })
  .reduce((acc, [k, v]) => {
    return { ...acc, [k]: v };
  }, {});

// Contracts with manual address
const initialManualAddressContractsConfig = [
  { name: "IOneSplit", address: CONSTANTS.CONTRACT_ADDRESSES.IOneSplit },
  {
    name: "IProxyRegistry",
    address: CONSTANTS.CONTRACT_ADDRESSES.IProxyRegistry,
  },
];
const initialManualAddressContracts = initialManualAddressContractsConfig
  .map(({ name, address }) => {
    const { abi } = getContract({ name });
    const c = new ethers.Contract(address, abi);

    return [name, c];
  })
  .reduce((acc, [k, v]) => {
    return { ...acc, [k]: v };
  }, {});

// Contracts that has a fixed address
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
  .reduce((acc, [k, v]) => {
    return { ...acc, [k]: v };
  }, {});

const initialContracts: any = {
  ...initialNoAddressContracts,
  ...initialManualAddressContracts,
  ...initialAddressedContracts,
};

function useContracts() {
  const { signer } = useWeb3.useContainer();
  const [contracts, setContracts] = useState(initialContracts);

  const updateContractSigner = () => {
    const contractsWithNewSigner = Object.keys(contracts)
      .map((k) => {
        return [k, contracts[k].connect(signer)];
      })
      .reduce((acc, [k, v]) => {
        return { ...acc, [k]: v };
      }, {});

    setContracts(contractsWithNewSigner);
  };

  useEffect(() => {
    if (signer === null) return;

    updateContractSigner();
  }, [signer]);

  return {
    contracts,
  };
}

export default createContainer(useContracts);
