import { createContainer } from "unstated-next";
import { useEffect, useState } from "react";

import useWeb3 from "./use-web3";
import useContracts from "./use-contracts";

import { ethers } from "ethers";

export interface CdpStats {
  cdpId: number;
  borrowed18: ethers.BigNumber;
  supplied18: ethers.BigNumber;
  cr: null | number;
}

function useCdps() {
  const { connected } = useWeb3.useContainer();
  const { contracts } = useContracts.useContainer();

  const [isGettingCdpStats, setIsGettingCdpStats] = useState<boolean>(false);
  const [cdpId, setCdpId] = useState<number>(0);
  const [cdpStats, setCdpStats] = useState<CdpStats>({
    cdpId,
    borrowed18: ethers.constants.Zero,
    supplied18: ethers.constants.Zero,
    cr: null,
  });

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

  const updateBorrowedSupplied = async () => {
    setIsGettingCdpStats(true);

    if (cdpId === 0) {
      setCdpStats({
        cdpId,
        borrowed18: ethers.constants.Zero,
        supplied18: ethers.constants.Zero,
        cr: null,
      });
    } else {
      const { borrowed, supplied } = await getCdpBorrowedSuppied(
        ethers.BigNumber.from(cdpId)
      );

      const cr = borrowed.eq(ethers.constants.Zero)
        ? 0.0
        : parseFloat(
            supplied.mul(ethers.BigNumber.from(100000)).div(borrowed).toString()
          ) / 1000;

      setCdpStats({
        cdpId,
        borrowed18: borrowed,
        supplied18: supplied,
        cr,
      });
    }

    setIsGettingCdpStats(false);
  };

  useEffect(() => {
    if (contracts === null) return;
    if (!connected) return;

    updateBorrowedSupplied();
  }, [connected, contracts, cdpId]);

  return {
    cdpStats,
    isGettingCdpStats,
    setCdpId,
    cdpId,
  };
}

export default createContainer(useCdps);
