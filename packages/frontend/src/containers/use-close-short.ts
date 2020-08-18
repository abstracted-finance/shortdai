import { createContainer } from "unstated-next";
import { useState } from "react";
import { CONSTANTS } from "@shortdai/smart-contracts";

import useProxy from "./use-proxy";
import useContracts from "./use-contracts";

function useCloseShort() {
  const { proxy } = useProxy.useContainer();
  const { contracts } = useContracts.useContainer();

  const [isClosingShort, setIsClosingShort] = useState<boolean>(false);

  const closeShortDaiPosition = async (cdpId: number) => {
    const { ShortDAIActions, CloseShortDAI } = contracts;
    const { CONTRACT_ADDRESSES } = CONSTANTS;

    const closeCalldata = ShortDAIActions.interface.encodeFunctionData(
      "flashloanAndClose",
      [
        CloseShortDAI.address,
        CONTRACT_ADDRESSES.ISoloMargin,
        CONTRACT_ADDRESSES.CurveFiSUSDv2,
        cdpId,
      ]
    );

    setIsClosingShort(true);

    try {
      const closeTx = await proxy[
        "execute(address,bytes)"
      ](ShortDAIActions.address, closeCalldata, { gasLimit: 1200000 });
      await closeTx.wait();
    } catch (e) {
      // TODO: Toast
    }

    setIsClosingShort(false);
  };

  return {
    isClosingShort,
    closeShortDaiPosition,
  };
}

export default createContainer(useCloseShort);
