import React, { useState, useEffect } from "react";
import { Paper, makeStyles, Box, Button } from "@material-ui/core";
import ethers from "ethers";
import { CONSTANTS, EthersContracts } from "@shortdai/smart-contracts";

import { prettyStringDecimals } from "./utils";
import useCdps, { Cdp } from "../containers/use-cdps";
import useWeb3 from "../containers/use-web3";
import useContracts from "../containers/use-contracts";
import useUsdc from "../containers/use-usdc";
import useProxy from "../containers/use-proxy";
import usePrices from "../containers/use-prices";
import { theme } from "./theme";
import LabelValue, { LabelValueProps } from "./label-value";

interface CdpSummaryProps {
  cdp: Cdp;
}

export const CdpSummary: React.FC<CdpSummaryProps> = ({ cdp }) => {
  const classes = useStyles();

  const { setCdps, cdps } = useCdps.useContainer();
  const { getUsdcBalances } = useUsdc.useContainer();
  const { connected, signer } = useWeb3.useContainer();
  const { contracts } = useContracts.useContainer();
  const { proxy } = useProxy.useContainer();
  const { prices } = usePrices.useContainer();

  const [daiUsdcRatio6, setDaiUsdcRatio6] = useState<null | ethers.BigNumber>(
    null
  );
  const [isClosingShort, setIsClosingShort] = useState<boolean>(false);

  // Decimals
  const decimal6 = ethers.utils.parseUnits("1", 6);
  const decimal18 = ethers.utils.parseUnits("1", 18);

  // Borrowed + supplied all in 18 decimals
  const [borrowed, setBorrowed] = useState<null | ethers.BigNumber>(null);
  const [supplied, setSupplied] = useState<null | ethers.BigNumber>(null);
  const [
    openedDaiUsdcRatio6,
    setOpenedDaiUsdcRatio6,
  ] = useState<null | ethers.BigNumber>(null);

  const closeShortDaiPosition = async () => {
    const { ShortDAIActions, CloseShortDAI } = contracts;
    const { CONTRACT_ADDRESSES } = CONSTANTS;

    const ethDaiRatio18 = ethers.utils.parseUnits(
      prices.ethereum.usd.toString(),
      18
    );

    const closeCalldata = ShortDAIActions.interface.encodeFunctionData(
      "flashloanAndClose",
      [
        CloseShortDAI.address,
        CONTRACT_ADDRESSES.ISoloMargin,
        CONTRACT_ADDRESSES.CurveFiSUSDv2,
        cdp.cdpId,
        ethDaiRatio18,
      ]
    );

    setIsClosingShort(true);

    try {
      const closeTx = await proxy["execute(address,bytes)"](
        ShortDAIActions.address,
        closeCalldata,
        {
          value: 2,
          gasLimit: 2000000,
        }
      );
      await closeTx.wait();
      await getUsdcBalances();

      // Remove cdp from manage
      setCdps(cdps.filter(({ cdpId }) => cdpId !== cdp.cdpId));
    } catch (e) {
      // TODO: Toast
    }

    setIsClosingShort(false);
  };

  const updateCdpStats = async () => {
    const { VaultStats, ICurveFiCurve } = contracts;
    const ICurveFiSUSDv2 = ICurveFiCurve.attach(
      CONSTANTS.CONTRACT_ADDRESSES.CurveFiSUSDv2
    );

    const [
      _supplied,
      _borrowed,
      _openedDaiUsdcRatio6,
    ] = await VaultStats.getCdpStats(cdp.cdpId);

    if (_borrowed.gt(ethers.constants.Zero)) {
      const supplied6 = _supplied.div(ethers.utils.parseUnits("1", 12));
      const daiRet = await ICurveFiSUSDv2.get_dy_underlying(1, 0, supplied6);
      const daiUsdcRatio = ethers.utils
        .parseUnits("1", 24)
        .div(daiRet.mul(ethers.utils.parseUnits("1", 18)).div(_supplied));
      setDaiUsdcRatio6(daiUsdcRatio);
    }

    setBorrowed(_borrowed);
    setSupplied(_supplied);
    setOpenedDaiUsdcRatio6(_openedDaiUsdcRatio6);
  };

  useEffect(() => {
    if (!connected) return;
    if (!signer) return;
    if (!contracts) return;
    if (!cdp) return;

    updateCdpStats();
  }, [connected, signer, contracts, cdp]);

  // Delta between opened and current
  let daiUsdcRatio6Delta = ethers.constants.Zero;

  // Did DAI deviate from peg even more?
  let negative = false;

  if (
    openedDaiUsdcRatio6 !== null &&
    openedDaiUsdcRatio6.gt(ethers.constants.Zero) &&
    daiUsdcRatio6 !== null &&
    daiUsdcRatio6.gt(ethers.constants.Zero)
  ) {
    // If the price when we opened is gt then current price
    if (openedDaiUsdcRatio6.gt(daiUsdcRatio6)) {
      daiUsdcRatio6Delta = openedDaiUsdcRatio6.sub(daiUsdcRatio6);
    }

    // Else if the price when we opened is lt current price
    else if (openedDaiUsdcRatio6.lt(daiUsdcRatio6)) {
      negative = true;
      daiUsdcRatio6Delta = daiUsdcRatio6.sub(openedDaiUsdcRatio6);
    } else {
      daiUsdcRatio6Delta = ethers.constants.Zero;
    }
  }

  const borrowedUsdc =
    borrowed &&
    openedDaiUsdcRatio6 &&
    borrowed.mul(openedDaiUsdcRatio6).div(ethers.utils.parseUnits("1", 6));

  // Initial Capital
  const initialCap = borrowedUsdc && supplied && supplied.sub(borrowedUsdc);

  // Leverage
  const leverage = initialCap && borrowedUsdc.mul(decimal18).div(initialCap);

  // Profit/Loss in 18 decimals
  const pl18 =
    supplied === null || leverage === null || daiUsdcRatio6 === null
      ? null
      : supplied
          .mul(daiUsdcRatio6Delta)
          .div(decimal6)

  // Collateralization Ratio 18 decimals
  const cr18 =
    supplied === null ||
    borrowed === null ||
    supplied.eq(ethers.constants.Zero) ||
    borrowed.eq(ethers.constants.Zero)
      ? null
      : supplied.mul(decimal18).div(borrowed);

  // Pretty strings
  const openedRatioString = bigIntToString(openedDaiUsdcRatio6, 6, 6);
  const initialCapString = bigIntToString(initialCap);
  const borrowedDaiString = bigIntToString(borrowed);
  const plString = (negative ? "-" : "+") + "USDC " + bigIntToString(pl18, 18);
  const crString = bigIntToString(cr18, 16) + "%";
  const leverageString = leverage && bigIntToString(leverage, 18, 1) + "x";

  function bigIntToString(
    x: null | ethers.ethers.BigNumberish,
    dec = 18,
    fixed = 2
  ) {
    return x
      ? prettyStringDecimals(ethers.utils.formatUnits(x, dec), fixed)
      : "...";
  }

  function renderRow(
    leftProps: LabelValueProps,
    middleProps: LabelValueProps,
    rightProps: LabelValueProps
  ) {
    return (
      <Box mb={2} display="flex">
        <Box flex={1}>
          <LabelValue textAlign="left" {...leftProps} />
        </Box>
        <Box flex={1}>
          <LabelValue {...middleProps} />
        </Box>
        <Box flex={1}>
          <LabelValue textAlign="right" {...rightProps} />
        </Box>
      </Box>
    );
  }

  return (
    <Paper className={classes.root} variant="outlined">
      <Box p={2.5}>
        {renderRow(
          { label: "CDP ID", children: cdp.cdpId },
          { label: "Opened Ratio", children: openedRatioString },
          { label: "Collat. Ratio", children: crString }
        )}

        {renderRow(
          {
            label: "Initial Capital",
            children: initialCapString,
            icon: "usdc",
          },
          { label: "Leverage", children: leverageString },
          { label: "Total Exposure", children: borrowedDaiString, icon: "dai" }
        )}

        <Button
          disabled={isClosingShort || prices === null}
          onClick={() => closeShortDaiPosition()}
          color={negative ? "secondary" : "primary"}
          variant="contained"
          fullWidth
        >
          close position:&nbsp;
          <strong>{plString}</strong>
        </Button>
      </Box>
    </Paper>
  );
};

const useStyles = makeStyles({
  root: {
    position: "relative",
    "&:not(:last-child)": {
      marginBottom: 16,
    },
  },
});
