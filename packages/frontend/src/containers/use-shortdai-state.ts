// State of where we are with shorting dai

// i.e.
// Do we have a proxy?
// Is our proxy approved to get USDC?

import { createContainer } from "unstated-next";
import { useEffect, useState } from "react";
import { CONSTANTS } from "@shortdai/smart-contracts";

import useWeb3 from "./use-web3";
import useProxy from "./use-proxy";
import useContracts from "./use-contracts";

import { ethers } from "ethers";

export enum ShortDaiState {
  NOT_CONNECTED,
  PENDING,
  SETUP_PROXY,
  APPROVE_USDC,
  READY,
}

function useShortDaiState() {
  const { signer, ethAddress, connected } = useWeb3.useContainer();
  const { proxyAddress } = useProxy.useContainer();
  const { contracts } = useContracts.useContainer();

  const [shortDaiState, setShortDaiState] = useState<ShortDaiState>(
    ShortDaiState.NOT_CONNECTED
  );

  const getShortDaiState = async () => {
    const { IERC20 } = contracts;
    const USDC = IERC20.attach(CONSTANTS.ERC20_ADDRESSES.USDC);

    // 1. Set to pending
    setShortDaiState(ShortDaiState.PENDING);

    // 2. Check if we have a proxy
    if (
      proxyAddress === null ||
      proxyAddress === ethers.constants.AddressZero
    ) {
      setShortDaiState(ShortDaiState.SETUP_PROXY);
      return;
    }

    // 3. Check if we have approved usdc
    const allowance = await USDC.allowance(ethAddress, proxyAddress);
    if (allowance.eq(ethers.constants.Zero)) {
      setShortDaiState(ShortDaiState.APPROVE_USDC);
      return;
    }

    setShortDaiState(ShortDaiState.READY);
  };

  useEffect(() => {
    if (signer === null) return;
    if (contracts === null) return;
    if (!connected) return;
    if (proxyAddress === null) return;

    getShortDaiState();
  }, [contracts, signer, proxyAddress, connected]);

  return {
    shortDaiState,
    getShortDaiState,
  };
}

export default createContainer(useShortDaiState);
