import { createContainer } from "unstated-next";
import { useState } from "react";
import { CONSTANTS } from "@shortdai/smart-contracts";

import usePrices from "./use-prices";
import useUsdc from "./use-usdc";
import useProxy from "./use-proxy";
import useContracts from "./use-contracts";

import { ethers } from "ethers";

function useOpenShort() {
  const { prices } = usePrices.useContainer();
  const { proxy } = useProxy.useContainer();
  const { contracts } = useContracts.useContainer();

  const [isOpeningShort, setIsOpeningShort] = useState<boolean>(false);

  // initialUsdcMargin6: BigNumber of initial usdc margin
  // leverage: number between 11-109 as we're using BigInt
  const getMintAmountDai = (
    initialUsdcMargin6: ethers.BigNumber,
    leverage: number,
    daiUsdcRatio6: ethers.BigNumber
  ) => {
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

    return flashloanDaiAmount;
  };

  // initialUsdcMargin6: BigNumber of initial usdc margin
  // leverage: number between 11-109
  const openShortDaiPosition = async (
    cdpId: number,
    initialUsdcMargin6: ethers.BigNumber,
    leverage: number,
    daiUsdcRatio6: ethers.BigNumber
  ) => {
    const { VaultStats, ShortDAIActions, OpenShortDAI } = contracts;

    const mintAmountDai = getMintAmountDai(
      initialUsdcMargin6,
      leverage,
      daiUsdcRatio6
    );

    const ethDaiRatio18 = ethers.utils.parseUnits(
      prices.ethereum.usd.toString(),
      18
    );

    const flashloanAmountWeth = mintAmountDai
      .mul(ethers.utils.parseUnits("1", 18))
      .div(ethDaiRatio18.div(2)); // Dividing by 2 to get 200% col ratio

    const openCalldata = ShortDAIActions.interface.encodeFunctionData(
      "flashloanAndOpen",
      [
        OpenShortDAI.address,
        CONSTANTS.CONTRACT_ADDRESSES.ISoloMargin,
        CONSTANTS.CONTRACT_ADDRESSES.CurveFiSUSDv2,
        cdpId,
        initialUsdcMargin6,
        mintAmountDai,
        flashloanAmountWeth,
        VaultStats.address,
        daiUsdcRatio6,
      ]
    );

    setIsOpeningShort(true);

    try {
      const openTx = await proxy[
        "execute(address,bytes)"
      ](ShortDAIActions.address, openCalldata, { value: 2, gasLimit: 4000000 });
      await openTx.wait();
    } catch (e) {
      // TODO: Toast
    }

    setIsOpeningShort(false);
  };

  return {
    getMintAmountDai,
    openShortDaiPosition,
    isOpeningShort,
  };
}

export default createContainer(useOpenShort);
