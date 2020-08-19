import React, { useState, useEffect } from "react";
import { Paper, makeStyles, Box, Typography, Button } from "@material-ui/core";
import ethers from "ethers";
import { CONSTANTS } from "@shortdai/smart-contracts";

import { prettyStringDecimals } from "./utils";
import { Cdp } from "../containers/use-cdps";
import useWeb3 from "../containers/use-web3";
import useContracts from "../containers/use-contracts";
import useUsdc from "../containers/use-usdc";
import useProxy from "../containers/use-proxy";

interface CdpSummaryProps {
  cdp: Cdp;
}

export const CdpSummary: React.FC<CdpSummaryProps> = ({ cdp }) => {
  const classes = useStyles();

  const { daiUsdcRatio6 } = useUsdc.useContainer();
  const { connected } = useWeb3.useContainer();
  const { contracts } = useContracts.useContainer();
  const { proxy } = useProxy.useContainer();

  const [isClosingShort, setIsClosingShort] = useState<boolean>(false);

  // 6 decimals
  const decimal6 = ethers.utils.parseUnits("1", 6);

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

  return (
    <Paper className={classes.root} variant="outlined">
      <Box p={4}>
        <Typography variant="h6">Vault ID: {cdp.cdpId}</Typography>
        <Typography>
          {supplied
            ? prettyStringDecimals(ethers.utils.formatUnits(supplied, 18))
            : "..."}{" "}
          USDC Locked up
        </Typography>
        <Typography>
          {negative && "-"}
          {pl18 !== null &&
            prettyStringDecimals(ethers.utils.formatUnits(pl18, 18))}{" "}
          USDC {negative ? "Loss" : "Profit"}
        </Typography>
        <Typography>
          DAI has gained {!negative && "-"}
          {prettyStringDecimals(
            ethers.utils.formatUnits(daiUsdcRatio6DeltaPercentage6, 4)
          )}
          % since opening this position
        </Typography>

        <Button
          disabled={isClosingShort}
          onClick={() => closeShortDaiPosition()}
          variant="contained"
          color="secondary"
        >
          Close position
        </Button>
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
