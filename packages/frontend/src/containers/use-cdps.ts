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
  borrowed18: ethers.BigNumber;
  supplied18: ethers.BigNumber;
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
    const { IDssCdpManager } = contracts;

    setIsGettingCdps(true);

    const cdpCountBN = await IDssCdpManager.count(proxyAddress);
    const cdpCount = parseInt(cdpCountBN.toString());

    const usdcIlk = ethers.utils.formatBytes32String("USDC-A");

    let cdps = [];

    let curCdpI = await IDssCdpManager.first(proxyAddress);
    let curCdpIlk = await IDssCdpManager.ilks(curCdpI);
    if (curCdpIlk === usdcIlk && !curCdpI.eq(ethers.constants.Zero)) {
      const { borrowed, supplied } = await getCdpBorrowedSuppied(curCdpI);
      cdps.push({
        cdpId: parseInt(curCdpI.toString()),
        ilk: curCdpIlk,
        borrowed18: borrowed,
        supplied18: supplied,
      });
    }

    for (let i = 0; i < cdpCount; i++) {
      const list = await IDssCdpManager.list(curCdpI);

      curCdpI = list.next;
      curCdpIlk = await IDssCdpManager.ilks(curCdpI);

      if (curCdpI.eq(ethers.constants.Zero)) {
        break;
      }

      if (curCdpIlk === usdcIlk) {
        const { borrowed, supplied } = await getCdpBorrowedSuppied(curCdpI);
        cdps.push({
          cdpId: parseInt(curCdpI.toString()),
          ilk: curCdpIlk,
          borrowed18: borrowed,
          supplied18: supplied,
        });
      }
    }

    console.log("cdps", cdps);

    setCdps(cdps);
    setIsGettingCdps(false);
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
  };
}

export default createContainer(useCdps);
