import { ethers } from "ethers";
import { createContainer } from "unstated-next";
import { useEffect, useState } from "react";
import { CONSTANTS } from "@shortdai/smart-contracts";

import useWeb3 from "./use-web3";
import useContracts from "./use-contracts";

interface Prices {
  ethereum: {
    usd: Number;
  };
  daiUsdcRatio: string; // Opening Position
  usdcDaiRatio: string; // Closing Position
}

function usePrices() {
  const { signer, connected } = useWeb3.useContainer();
  const { contracts } = useContracts.useContainer();

  const [prices, setPrices] = useState<null | Prices>(null);

  const getPrices = async () => {
    const { ICurveFiCurve } = contracts;
    const ICurveFiSUSDv2 = ICurveFiCurve.attach(
      CONSTANTS.CONTRACT_ADDRESSES.CurveFiSUSDv2
    );

    try {
      // Get 1mil Tokens
      // index 0 = DAI
      // index 1 = USDC
      const [daiUsdc, usdcDai, gecko] = await Promise.all([
        ICurveFiSUSDv2.get_dy_underlying(
          0,
          1,
          ethers.utils.parseUnits("1000000", CONSTANTS.ERC20_DECIMALS.DAI)
        ),
        ICurveFiSUSDv2.get_dy_underlying(
          1,
          0,
          ethers.utils.parseUnits("1000000", CONSTANTS.ERC20_DECIMALS.USDC)
        ),
        fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
          {
            referrer: "https://www.coingecko.com/",
            body: null,
            method: "GET",
            mode: "cors",
            credentials: "omit",
          }
        ),
      ]);

      const geckoData = await gecko.json();

      setPrices({
        ethereum: {
          usd: geckoData.ethereum.usd,
        },
        daiUsdcRatio: ethers.utils.formatUnits(daiUsdc, 6 + 6), // 1 milllion + 6 decimals
        usdcDaiRatio: ethers.utils.formatUnits(usdcDai, 24), // 1 million + 18 decimals
      });
    } catch (e) {
      console.log("Failed to connect to coingecko API");
    }
  };

  useEffect(() => {
    if (!connected) return;
    if (signer === null) return;
    if (contracts === null) return;

    getPrices();
    setInterval(getPrices, 300000);
  }, [connected, signer, contracts]);

  return {
    prices,
  };
}

export default createContainer(usePrices);
