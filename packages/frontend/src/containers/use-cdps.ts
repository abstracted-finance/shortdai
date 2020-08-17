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

  const getCdpBorrowedSuppied = async (cdpId: ethers.BigNumber) => {
    const { IDssCdpManager, VatLike } = contracts;

    const vat = await IDssCdpManager.vat();
    const urn = await IDssCdpManager.urns(cdpId);
    const ilk = await IDssCdpManager.ilks(cdpId);
    const owner = await IDssCdpManager.owns(cdpId);

    const IVatLike = VatLike.attach(vat);

    const [_, rate] = await IVatLike.ilks(ilk);
    const [supplied, art] = await IVatLike.urns(ilk, urn);
    const dai = await IVatLike.dai(owner);

    const RAY = ethers.utils.parseUnits("1", 27);
    const rad = art.mul(rate).sub(dai);
    const wad = rad.div(RAY);

    const borrowed = wad.mul(RAY).lt(rad)
      ? wad.add(ethers.BigNumber.from(1))
      : wad;

    return {
      borrowed,
      supplied,
    };
  };

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
    cdps,
    isGettingCdps,
    getCdpBorrowedSuppied
  };
}

export default createContainer(useCdps);
