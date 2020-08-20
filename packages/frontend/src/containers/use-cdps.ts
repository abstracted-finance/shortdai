import { createContainer } from "unstated-next";
import { useEffect, useState } from "react";
import { CONSTANTS } from "@shortdai/smart-contracts";

import useWeb3 from "./use-web3";
import useProxy from "./use-proxy";
import useContracts from "./use-contracts";

import { ethers } from "ethers";

export interface Cdp {
  cdpId: number;
  ilk: string;
  urn: string;
}

function useCdps() {
  const { signer, ethAddress, connected } = useWeb3.useContainer();
  const { proxyAddress } = useProxy.useContainer();
  const { contracts } = useContracts.useContainer();

  const [isGettingCdps, setIsGettingCdps] = useState<boolean>(false);
  const [cdps, setCdps] = useState<Cdp[]>([]);

  const getCdps = async () => {
    const { IGetCdps } = contracts;

    setIsGettingCdps(true);

    const cdpsAsc = await IGetCdps.getCdpsAsc(
      CONSTANTS.CONTRACT_ADDRESSES.IDssCdpManager,
      proxyAddress
    );

    const usdcIlk = ethers.utils.formatBytes32String("USDC-A");

    const usdcCdps = cdpsAsc.ids
      .map((cdpId, idx) => {
        return {
          cdpId: parseInt(cdpId.toString()),
          ilk: cdpsAsc.ilks[idx],
          urn: cdpsAsc.urns[idx],
        };
      })
      .filter(({ ilk }) => ilk === usdcIlk);

    setIsGettingCdps(false);
    setCdps(usdcCdps);
  };

  useEffect(() => {
    if (signer === null) return;
    if (contracts === null) return;
    if (!connected) return;
    if (proxyAddress === null) return;
    if (proxyAddress === ethers.constants.AddressZero) return;

    getCdps();
  }, [contracts, signer, proxyAddress, connected]);

  return {
    setCdps,
    cdps,
    getCdps,
    isGettingCdps,
  };
}

export default createContainer(useCdps);
