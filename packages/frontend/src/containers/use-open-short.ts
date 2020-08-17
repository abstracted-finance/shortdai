// State of where we are with shorting dai

// i.e.
// Do we have a proxy?
// Is our proxy approved to get USDC?

import { createContainer } from "unstated-next";
import { useEffect, useState } from "react";
import { CONSTANTS } from "@shortdai/smart-contracts";

import useUsdc from "./use-usdc";
import useWeb3 from "./use-web3";
import useProxy from "./use-proxy";
import useContracts from "./use-contracts";

import { ethers } from "ethers";

function useShortDaiState() {
  const { proxy } = useProxy.useContainer();
  const { contracts } = useContracts.useContainer();
  const { daiUsdcRatio6 } = useUsdc.useContainer();

  const [isOpeningShort, setIsOpeningShort] = useState<boolean>(false);

  // initialUsdcMargin6: BigNumber of initial usdc margin
  // leverage: number between 11-109
  const openShortDaiPosition = async (
    initialUsdcMargin6: ethers.BigNumber,
    leverage: number
  ) => {
    const { ShortDAIActions, OpenShortDAI } = contracts;

    const tenBN = ethers.BigNumber.from("10");
    const leverageBN = ethers.BigNumber.from(leverage.toString());

    const bn6 = ethers.utils.parseUnits("1", 6);

    // USDC (6 decimals) -> DAI (18 decimals)
    // Divide by 10 cause leverage is between 11-109
    const flashloanDaiAmount = initialUsdcMargin6
      .mul(
        ethers.utils.parseUnits(
          "1",
          CONSTANTS.ERC20_DECIMALS.DAI - CONSTANTS.ERC20_DECIMALS.USDC
        )
      )
      .mul(leverageBN)
      .div(tenBN)
      .mul(daiUsdcRatio6)
      .div(bn6);

    const openCalldata = ShortDAIActions.interface.encodeFunctionData(
      "flashloanAndOpen",
      [
        OpenShortDAI.address,
        CONSTANTS.CONTRACT_ADDRESSES.ISoloMargin,
        CONSTANTS.CONTRACT_ADDRESSES.CurveFiSUSDv2,
        0,
        initialUsdcMargin6,
        flashloanDaiAmount,
      ]
    );

    setIsOpeningShort(true);

    try {
      const openTx = await proxy[
        "execute(address,bytes)"
      ](ShortDAIActions.address, openCalldata, { gasLimit: 1200000 });
      await openTx.wait();
    } catch (e) {
      // TODO: Toast
    }

    setIsOpeningShort(false);
  };

  return {
    openShortDaiPosition,
    isOpeningShort,
  };
}

export default createContainer(useShortDaiState);
