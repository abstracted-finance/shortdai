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

  const [daiAmount, setDaiAmount] = useState(
    ethers.utils.parseUnits("1", CONSTANTS.ERC20_DECIMALS.DAI)
  );
  const [timeoutIds, setTimeoutIds] = useState({});
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
        ICurveFiSUSDv2.get_dy_underlying(0, 1, daiAmount),
        ICurveFiSUSDv2.get_dy_underlying(
          1,
          0,
          ethers.utils.parseUnits("1", CONSTANTS.ERC20_DECIMALS.USDC)
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
        daiUsdcRatio: ethers.utils.formatUnits(
          daiUsdc
            .mul(ethers.utils.parseUnits("1", CONSTANTS.ERC20_DECIMALS.DAI))
            .div(daiAmount),
          CONSTANTS.ERC20_DECIMALS.USDC
        ), // 1 milllion + 6 decimals
        usdcDaiRatio: ethers.utils.formatUnits(usdcDai, CONSTANTS.ERC20_DECIMALS.DAI)
      });
    } catch (e) {
      console.log("Failed to connect to coingecko API");
    }
  };

  const updateDaiUsdcRatio = async (daiAmountWei: ethers.BigNumber) => {
    const { ICurveFiCurve } = contracts;
    const ICurveFiSUSDv2 = ICurveFiCurve.attach(
      CONSTANTS.CONTRACT_ADDRESSES.CurveFiSUSDv2
    );

    const temp = { ...prices };

    setPrices(null);

    const one = ethers.utils.parseUnits("1", CONSTANTS.ERC20_DECIMALS.DAI);
    const daiAmountWeiFixed = daiAmountWei.lt(one) ? one : daiAmountWei;

    setDaiAmount(daiAmountWeiFixed);

    const daiUsdc = await ICurveFiSUSDv2.get_dy_underlying(
      0,
      1,
      daiAmountWeiFixed
    );

    const daiUsdcFixed = daiUsdc
      .mul(ethers.utils.parseUnits("1", 18))
      .div(daiAmountWeiFixed);

    const daiUsdcStr = ethers.utils.formatUnits(
      daiUsdcFixed,
      CONSTANTS.ERC20_DECIMALS.USDC
    );

    setPrices({ ...temp, daiUsdcRatio: daiUsdcStr });
  };

  const getDaiUsdcRatio = (daiAmountWei: ethers.BigNumber) => {
    const key = "daiUsdcRatio";

    if (timeoutIds[key]) {
      clearTimeout(timeoutIds[key]);
    }

    const id = setTimeout(() => updateDaiUsdcRatio(daiAmountWei), 500);

    setTimeoutIds({ ...timeoutIds, [key]: id });
  };

  useEffect(() => {
    if (!connected) return;
    if (signer === null) return;
    if (contracts === null) return;

    getPrices();
    setInterval(getPrices, 5000);
  }, [connected, signer, contracts]);

  return {
    prices,
    getDaiUsdcRatio,
    updateDaiUsdcRatio,
  };
}

export default createContainer(usePrices);
