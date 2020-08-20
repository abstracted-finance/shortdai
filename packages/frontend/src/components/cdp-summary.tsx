import React, { useState, useEffect } from "react";
import { Paper, makeStyles, Box, Typography, Button } from "@material-ui/core";
import ethers from "ethers";
import { CONSTANTS } from "@shortdai/smart-contracts";

import { prettyStringDecimals } from "./utils";
import useCdps, { Cdp } from "../containers/use-cdps";
import useWeb3 from "../containers/use-web3";
import useContracts from "../containers/use-contracts";
import useUsdc from "../containers/use-usdc";
import useProxy from "../containers/use-proxy";

interface CdpSummaryProps {
  cdp: Cdp;
}

export const CdpSummary: React.FC<CdpSummaryProps> = ({ cdp }) => {
  const classes = useStyles();

  const { setCdps, cdps } = useCdps.useContainer();
  const { getUsdcBalances, daiUsdcRatio6 } = useUsdc.useContainer();
  const { connected } = useWeb3.useContainer();
  const { contracts } = useContracts.useContainer();
  const { proxy } = useProxy.useContainer();

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

    const closeCalldata = ShortDAIActions.interface.encodeFunctionData(
      "flashloanAndClose",
      [
        CloseShortDAI.address,
        CONTRACT_ADDRESSES.ISoloMargin,
        CONTRACT_ADDRESSES.CurveFiSUSDv2,
        cdp.cdpId,
      ]
    );

    setIsClosingShort(true);

    try {
      const closeTx = await proxy[
        "execute(address,bytes)"
      ](ShortDAIActions.address, closeCalldata, { gasLimit: 1200000 });
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
    const { VaultStats } = contracts;

    const [
      _borrowed,
      _supplied,
      _openedDaiUsdcRatio6,
    ] = await VaultStats.getCdpStats(cdp.cdpId);

    setBorrowed(_borrowed);
    setSupplied(_supplied);
    setOpenedDaiUsdcRatio6(_openedDaiUsdcRatio6);
  };

  useEffect(() => {
    if (!connected) return;
    if (!contracts) return;
    if (!cdp) return;

    updateCdpStats();
  }, [connected, contracts, cdp]);

  // Delta between opened and current
  let daiUsdcRatio6Delta = ethers.constants.Zero;

  // Did DAI deviate from peg even more?
  let negative = false;

  if (
    openedDaiUsdcRatio6 !== null &&
    openedDaiUsdcRatio6.gt(ethers.constants.Zero) &&
    daiUsdcRatio6 !== null
  ) {
    // If the price when we opened is gt then current price
    if (openedDaiUsdcRatio6.gt(daiUsdcRatio6)) {
      daiUsdcRatio6Delta = openedDaiUsdcRatio6.sub(daiUsdcRatio6);
    }

    // Else if the price when we opened is lt current price
    else if (openedDaiUsdcRatio6.lt(daiUsdcRatio6)) {
      negative = true;
      daiUsdcRatio6Delta = daiUsdcRatio6.sub(openedDaiUsdcRatio6);
    }
  }

  // Percentage difference in 6 decimal places
  const daiUsdcRatio6DeltaPercentage6 = daiUsdcRatio6Delta
    .mul(decimal6)
    .div(daiUsdcRatio6);

  // Profit/Loss in 18 decimals
  const pl18 =
    supplied === null
      ? null
      : supplied.mul(daiUsdcRatio6DeltaPercentage6).div(decimal6);

  // Collateralization Ratio 18 decimals
  const cr18 =
    supplied === null || supplied.eq(ethers.constants.Zero)
      ? null
      : borrowed.mul(decimal18).div(supplied);

  // Pretty strings
  const suppliedUsdcString = supplied
    ? prettyStringDecimals(ethers.utils.formatUnits(supplied, 18))
    : "...";

  const plString =
    pl18 === null
      ? "..."
      : prettyStringDecimals(ethers.utils.formatUnits(pl18, 18));

  const crString =
    cr18 === null
      ? "..."
      : prettyStringDecimals(ethers.utils.formatUnits(cr18, 16)) + "%";

  return (
    <Paper className={classes.root} variant="outlined">
      <Box p={2.5}>
        <Box mb={1}>
          <Typography color="textPrimary" variant="h6">
            USDC&nbsp;&nbsp;|&nbsp;&nbsp;CDP ID: {cdp.cdpId}
          </Typography>
        </Box>

        <Box display="flex" alignItems="center">
          <Box flex={1.5}>
            <Typography variant="h6">Amount</Typography>
            <Typography color="textSecondary">{suppliedUsdcString}</Typography>
          </Box>

          <Box flex={1}>
            <Typography variant="h6">P/L</Typography>
            <Typography
              color={
                (pl18 || ethers.constants.Zero).lt(
                  ethers.utils.parseUnits("0.01", 18)
                )
                  ? "textSecondary"
                  : negative
                  ? "error"
                  : "primary"
              }
            >
              {plString}
            </Typography>
          </Box>

          <Box flex={1}>
            <Typography variant="h6">CR</Typography>
            <Typography
              color={
                (cr18 || ethers.constants.MaxUint256).lt(
                  ethers.utils.parseUnits("115", 16)
                )
                  ? "error"
                  : "textSecondary"
              }
            >
              {crString}
            </Typography>
          </Box>

          <Box flex={1} textAlign="right">
            <Button
              disabled={isClosingShort}
              onClick={() => closeShortDaiPosition()}
              color="secondary"
              fullWidth
            >
              CLOSE
            </Button>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

const useStyles = makeStyles({
  root: {
    "&:not(:last-child)": {
      marginBottom: 16,
    },
  },
});
