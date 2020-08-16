import { createContainer } from "unstated-next";
import { useEffect, useState } from "react";

import useWeb3 from "./use-web3";
import useContracts from "./use-contracts";

import { EthersContracts, getEthersContracts } from "@shortdai/smart-contracts";
import { ethers } from "ethers";

const network = "localhost";

function useProxy() {
  const { signer, ethAddress, connected } = useWeb3.useContainer();
  const { contracts } = useContracts.useContainer();

  const [proxyAddress, setProxyAddress] = useState<null | string>(null);

  const hasProxy =
    proxyAddress !== null && proxyAddress !== ethers.constants.AddressZero;

  const proxy = hasProxy ? contracts.IDSProxy.attach(proxyAddress) : null;

  const getProxy = async () => {
    const { IProxyRegistry } = contracts;
    const address = await IProxyRegistry.proxies(ethAddress);
    setProxyAddress(address);
  };

  const createProxy = async () => {
    const { IProxyRegistry } = contracts;
    const tx = await IProxyRegistry["build(address)"](ethAddress);
    await tx.wait();
    await getProxy();
  };

  useEffect(() => {
    if (!connected) return;
    if (contracts === null) return;

    getProxy();
  }, [connected, contracts]);

  return {
    hasProxy,
    proxy,
    getProxy,
    createProxy,
    proxyAddress,
  };
}

export default createContainer(useProxy);
