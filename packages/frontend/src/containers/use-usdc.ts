import { createContainer } from "unstated-next";
import { useEffect, useState } from "react";
import { CONSTANTS } from "@shortdai/smart-contracts";

import useWeb3 from "./use-web3";
import useProxy from "./use-proxy";
import useContracts from "./use-contracts";

import { ethers } from "ethers";

function useUsdc() {
  const { connected, signer, ethAddress } = useWeb3.useContainer();
  const { proxyAddress } = useProxy.useContainer();
  const { contracts } = useContracts.useContainer();

  const [isGettingDaiUsdcRatio, setIsGettingDaiUsdcRatio] = useState<boolean>(
    false
  );
  const [usdcBal6, setUsdcBal6] = useState<ethers.BigNumber>(
    ethers.constants.Zero
  );
  const [daiUsdcRatio6, setDaiUsdcRatio6] = useState<ethers.BigNumber>(
    ethers.constants.Zero
  );
  const [isApprovingUsdc, setIsApprovingUsdc] = useState<boolean>(false);

  const approveUsdc = async () => {
    const { IERC20 } = contracts;
    const USDC = IERC20.attach(CONSTANTS.ERC20_ADDRESSES.USDC);

    setIsApprovingUsdc(true);

    try {
      const tx = await USDC.approve(proxyAddress, ethers.constants.MaxUint256);
      await tx.wait();
    } catch (e) {
      // TODO: Toast
    }

    setIsApprovingUsdc(false);
  };

  const getUsdcBalances = async () => {
    const { IERC20 } = contracts;
    const USDC = IERC20.attach(CONSTANTS.ERC20_ADDRESSES.USDC);

    // Balance in 6 decimals
    const bal6 = await USDC.balanceOf(ethAddress);

    setUsdcBal6(bal6);
  };

  const getDaiUsdcRates = async () => {
    setIsGettingDaiUsdcRatio(true);

    const { ICurveFiCurve } = contracts;
    const ICurveFiSUSDv2 = ICurveFiCurve.attach(
      CONSTANTS.CONTRACT_ADDRESSES.CurveFiSUSDv2
    );

    // Get 1mil Tokens
    // index 0 = DAI
    // index 1 = USDC
    const daiUsdcRatio = await ICurveFiSUSDv2.get_dy_underlying(
      0,
      1,
      ethers.utils.parseUnits("1000000", CONSTANTS.ERC20_DECIMALS.DAI)
    );

    const daiUsdcRatio6 = daiUsdcRatio.div(ethers.BigNumber.from(1000000));

    // setDaiUsdcRatio6(ethers.utils.parseUnits("0.999623", 6));
    setDaiUsdcRatio6(daiUsdcRatio6);
    setIsGettingDaiUsdcRatio(false);

    // Get DAI USDC rates every 15 seconds
    setTimeout(() => getDaiUsdcRates(), 15000);
  };

  useEffect(() => {
    if (!connected) return;
    if (signer === null) return;
    if (contracts === null) return;

    getUsdcBalances();
    getDaiUsdcRates();
  }, [connected, proxyAddress, signer, contracts]);

  return {
    approveUsdc,
    isApprovingUsdc,
    daiUsdcRatio6,
    usdcBal6,
    isGettingDaiUsdcRatio,
    getDaiUsdcRates,
    getUsdcBalances,
  };
}

export default createContainer(useUsdc);
