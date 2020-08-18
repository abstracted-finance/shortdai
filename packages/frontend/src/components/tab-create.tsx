import {
  Box,
  Button,
  InputBase,
  Paper,
  Slider,
  Typography,
  Collapse,
} from "@material-ui/core";
import { ethers } from "ethers";
import { ChangeEvent, useEffect, useState } from "react";

import useSelectedCdp from "../containers/use-selected-cdp";
import useProxy from "../containers/use-proxy";
import useOpenShort from "../containers/use-open-short";
import useUsdc from "../containers/use-usdc";
import useShortDaiState, {
  ShortDaiState,
} from "../containers/use-shortdai-state";
import { prettyStringDecimals } from "./utils";
import { theme } from "./theme";

import { useStyles } from "./styles";
import { CONSTANTS } from "@shortdai/smart-contracts";

const TabCreate = ({ leverage, setLeverage }) => {
  const classes = useStyles();

  const {
    getFlashloanDaiAmount,
    openShortDaiPosition,
    isOpeningShort,
  } = useOpenShort.useContainer();
  const { isCreatingProxy, createProxy } = useProxy.useContainer();
  const {
    daiUsdcRatio6,
    usdcBal6,
    isApprovingUsdc,
    approveUsdc,
  } = useUsdc.useContainer();
  const { getShortDaiState, shortDaiState } = useShortDaiState.useContainer();
  const { cdpId, isGettingCdpStats, cdpStats } = useSelectedCdp.useContainer();

  const [usdcPrincipal, setUsdcPrincipal] = useState("");

  const usdcPrincipalBN = ethers.utils.parseUnits(
    usdcPrincipal || "0",
    CONSTANTS.ERC20_DECIMALS.USDC
  );

  const flashloanDaiAmount = getFlashloanDaiAmount(
    usdcPrincipalBN,
    leverage - 10
  );
  const burrowingStr = prettyStringDecimals(
    ethers.utils.formatUnits(flashloanDaiAmount, 18)
  );

  const toSupplyUsdcAmount = usdcPrincipalBN.add(
    flashloanDaiAmount.mul(daiUsdcRatio6).div(ethers.utils.parseUnits("1", 18))
  );
  const supplyingStr = prettyStringDecimals(
    ethers.utils.formatUnits(toSupplyUsdcAmount, 6)
  );

  const newCR = cdpStats.borrowed18
    .add(flashloanDaiAmount)
    .eq(ethers.constants.Zero)
    ? 0.0
    : parseFloat(
        cdpStats.supplied18
          .add(toSupplyUsdcAmount.mul(ethers.utils.parseUnits("1", 12))) // Convert to 18 decimals
          .mul(ethers.BigNumber.from(100000)) // Multiply by 100000 so we can get decimals (in bignumbers)
          .div(cdpStats.borrowed18.add(flashloanDaiAmount))
          .toString()
      ) / 1000;
  const newCRStr = prettyStringDecimals(newCR.toString()) + "%";

  const validUsdcPrincipal =
    usdcPrincipalBN.lte(usdcBal6 || ethers.constants.Zero) &&
    usdcPrincipalBN.gt(ethers.constants.Zero);

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const {
      target: { value },
    } = event;
    if (/^[0-9]*[.,]?[0-9]*$/.test(value)) {
      setUsdcPrincipal(value);
    }
  }

  return (
    <>
      <Paper variant="outlined">
        <Box p={2.5}>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="h6" component="p">
              Principal
            </Typography>

            <Typography variant="h6" component="p">
              Balance:{" "}
              {usdcBal6 === null
                ? "..."
                : ethers.utils.formatUnits(usdcBal6, 6)}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center">
            <Box flex={1} pr={1}>
              <InputBase
                placeholder="0.0"
                value={usdcPrincipal}
                onChange={handleInputChange}
              />
            </Box>

            <Button
              onClick={() => {
                if (usdcBal6 === null) return;
                setUsdcPrincipal(ethers.utils.formatUnits(usdcBal6, 6));
              }}
              variant="outlined"
              size="small"
              color="primary"
            >
              MAX
            </Button>

            <Box display="flex" alignItems="center" ml={2}>
              <img src="/usdc.png" width={24} height={24} />
              <Box flexShrink={0} width={8} />
              <Typography>USDC</Typography>
            </Box>
          </Box>

          <Box mt={4} textAlign="center">
            <Typography variant="h6">Leverage</Typography>
            <Typography
              component="span"
              variant="h3"
              className={classes.leverage}
            >
              {(leverage / 10).toString()}
            </Typography>

            <Box px={2}>
              <Slider
                value={leverage}
                onChange={(_, newValue: number) => {
                  setLeverage(newValue);
                }}
                min={11}
                max={109}
              />
            </Box>
          </Box>

          <Collapse in={validUsdcPrincipal}>
            <Box textAlign="center">
              <Typography variant="h6">Collateralization Ratio</Typography>
              <Typography>{newCRStr}</Typography>
            </Box>
            <Box mt={2} display="flex" alignItems="center">
              <Box flex={1} textAlign="center">
                <Typography variant="h6">Supplying (USDC)</Typography>
                <Typography color="primary">{supplyingStr}</Typography>
              </Box>

              <img src="/maker.png" width={48} />

              <Box flex={1} textAlign="center">
                <Typography variant="h6">Burrowing (DAI)</Typography>
                <Typography color="error">{burrowingStr}</Typography>
              </Box>
            </Box>
          </Collapse>
        </Box>
      </Paper>

      <Box mt={2} display="flex">
        <Button
          variant="contained"
          color="primary"
          disabled={
            shortDaiState === ShortDaiState.PENDING ||
            shortDaiState === ShortDaiState.NOT_CONNECTED ||
            isApprovingUsdc ||
            isCreatingProxy ||
            isOpeningShort ||
            (shortDaiState === ShortDaiState.READY && !validUsdcPrincipal)
          }
          size="large"
          fullWidth
          onClick={() => {
            if (shortDaiState === ShortDaiState.SETUP_PROXY) {
              createProxy().then(() => getShortDaiState());
              return;
            }

            if (shortDaiState === ShortDaiState.APPROVE_USDC) {
              approveUsdc().then(() => getShortDaiState());
              return;
            }

            if (shortDaiState === ShortDaiState.READY) {
              const usdcPrincipal6 = ethers.utils.parseUnits(usdcPrincipal, 6);

              // (Leverage - 10) because we're using "cents"
              // i.e. leverage 15 = x1.5
              // And because we wanna minus initial usdcPrincipal6
              openShortDaiPosition(0, usdcPrincipal6, leverage - 10);
              return;
            }
          }}
        >
          {shortDaiState === ShortDaiState.PENDING ? "INTIALIZING" : null}
          {shortDaiState === ShortDaiState.NOT_CONNECTED
            ? "CONNECT WALLET TO CONTINUE"
            : null}
          {shortDaiState === ShortDaiState.SETUP_PROXY ? "SETUP" : null}
          {shortDaiState === ShortDaiState.APPROVE_USDC ? "APPROVE" : null}
          {shortDaiState === ShortDaiState.READY && !validUsdcPrincipal
            ? usdcPrincipal === ""
              ? "ENTER PRINCIPAL AMOUNT"
              : "INVALID PRINCIPAL AMOUNT"
            : null}
          {shortDaiState === ShortDaiState.READY && validUsdcPrincipal
            ? "OPEN"
            : null}
        </Button>
      </Box>
    </>
  );
};

export default TabCreate;
