import { createContainer } from "unstated-next";
import { useEffect, useState } from "react";

import useWeb3 from "./use-web3";
import { EthersContracts, getEthersContracts } from "@shortdai/smart-contracts";

const network = "localhost";

function useContracts() {
  const { signer } = useWeb3.useContainer();
  const [contracts, setContracts] = useState<null | EthersContracts>(null);

  const updateContractSigner = () => {
    const newContracts = getEthersContracts(network, signer);

    setContracts(newContracts);
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
