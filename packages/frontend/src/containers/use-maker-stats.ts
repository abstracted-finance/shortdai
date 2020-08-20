import { createContainer } from "unstated-next";
import { useEffect, useState } from "react";
import { CONSTANTS } from "@shortdai/smart-contracts";

import useWeb3 from "./use-web3";
import useContracts from "./use-contracts";

import { ethers } from "ethers";

function useMakerStats() {
  const { ethAddress, connected } = useWeb3.useContainer();
  const { contracts } = useContracts.useContainer();

  const [stabilityApy, setStabilityApy] = useState<null | number>(null);

  const getMakerStats = async () => {
    const { JugLike } = contracts;

    const jugIlk = await JugLike.attach(
      CONSTANTS.CONTRACT_ADDRESSES.MCDJug
    ).ilks(ethers.utils.formatBytes32String("USDC-A"));

    const duty = jugIlk[0];
    // const duty = ethers.BigNumber.from("1000000000158153903837946258")

    // Example on calculating stability rates
    // https://docs.makerdao.com/smart-contract-modules/rates-module
    const RAY = ethers.BigNumber.from("1000000000000000000000000000");
    const r = duty.mul(ethers.utils.parseUnits("1", 18)).div(RAY);
    const stabilityFee = Math.pow(
      parseFloat(ethers.utils.formatUnits(r, 18)),
      365 * 24 * 60 * 60
    );
    const stabilityApy = stabilityFee - 1;
    
    setStabilityApy(stabilityApy);
  };

  useEffect(() => {
    if (!connected) return;
    if (contracts === null) return;

    getMakerStats();
  }, [ethAddress, connected, contracts]);

  return {
    stabilityApy,
  };
}

export default createContainer(useMakerStats);
