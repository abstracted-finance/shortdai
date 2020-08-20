import { createContainer } from "unstated-next";
import { useEffect, useState } from "react";

import useWeb3 from "./use-web3";
import useContracts from "./use-contracts";

import { ethers } from "ethers";

function useProxy() {
  const { ethAddress, connected } = useWeb3.useContainer();
  const { contracts } = useContracts.useContainer();

  const [isCreatingProxy, setIsCreatingProxy] = useState<boolean>(false);
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
    setIsCreatingProxy(true);

    try {
      const tx = await IProxyRegistry["build(address)"](ethAddress);
      await tx.wait();
    } catch (e) {
      // TODO: Do a toast
    }

    await getProxy();
    setIsCreatingProxy(false);
  };

  useEffect(() => {
    if (!connected) return;
    if (contracts === null) return;

    getProxy();
  }, [ethAddress, connected, contracts]);

  return {
    hasProxy,
    proxy,
    getProxy,
    createProxy,
    isCreatingProxy,
    proxyAddress,
  };
}

export default createContainer(useProxy);
