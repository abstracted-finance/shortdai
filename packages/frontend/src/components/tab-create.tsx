import {
  Box,
  Button,
  Collapse,
  InputBase,
  makeStyles,
  Paper,
  Slider,
  Typography,
  createStyles,
} from "@material-ui/core";
import { CONSTANTS } from "@shortdai/smart-contracts";
import { ethers } from "ethers";
import { ChangeEvent, useState } from "react";
import useOpenShort from "../containers/use-open-short";
import useProxy from "../containers/use-proxy";
import useShortDaiState, {
  ShortDaiState,
} from "../containers/use-shortdai-state";
import useUsdc from "../containers/use-usdc";
import useCdps from "../containers/use-cdps";
import useMakerStats from "../containers/use-maker-stats";
import { prettyStringDecimals } from "./utils";
import { theme } from "./theme";

const TabCreate = ({ leverage, setLeverage }) => {
  const classes = useStyles();

  const { stabilityApy } = useMakerStats.useContainer();
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
    getDaiUsdcRates,
    getUsdcBalances,
  } = useUsdc.useContainer();
  const { getShortDaiState, shortDaiState } = useShortDaiState.useContainer();
  const { getCdps } = useCdps.useContainer();

  const [usdcPrincipal, setUsdcPrincipal] = useState("");

  const usdcPrincipalBN = ethers.utils.parseUnits(
    usdcPrincipal || "0",
    CONSTANTS.ERC20_DECIMALS.USDC
  );

  const flashloanDaiAmount = getFlashloanDaiAmount(
    usdcPrincipalBN,
    leverage - 10
  );
  const borrowingStr = prettyStringDecimals(
    ethers.utils.formatUnits(flashloanDaiAmount, 18)
  );
  const hasMinDaiAmount = flashloanDaiAmount.gte(
    ethers.utils.parseUnits("100", 18)
  );

  const toSupplyUsdcAmount = usdcPrincipalBN.add(
    flashloanDaiAmount.mul(daiUsdcRatio6).div(ethers.utils.parseUnits("1", 18))
  );
  const supplyingStr = prettyStringDecimals(
    ethers.utils.formatUnits(toSupplyUsdcAmount, 6)
  );

  const newCR = flashloanDaiAmount.eq(ethers.constants.Zero)
    ? 0.0
    : parseFloat(
        toSupplyUsdcAmount
          .mul(ethers.utils.parseUnits("1", 12)) // Convert to 18 decimals
          .mul(ethers.BigNumber.from(100000)) // Multiply by 100000 so we can get decimals (in bignumbers)
          .div(flashloanDaiAmount)
          .toString()
      ) / 1000;
  const newCRStr = prettyStringDecimals(newCR.toString()) + "%";

  const stabilityApyStr =
    stabilityApy === null ? "..." : (stabilityApy * 100).toFixed(2) + "%";

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

  // < 1% difference
  const daiUsdcBalApproximated6 =
    daiUsdcRatio6 === null
      ? null
      : daiUsdcRatio6
          .div(ethers.utils.parseUnits("1", 4))
          .mul(ethers.utils.parseUnits("1", 4));

  const isDaiCloseToUsdc =
    daiUsdcBalApproximated6 === null
      ? false
      : daiUsdcBalApproximated6.eq(ethers.utils.parseUnits("1", 6));

  return (
    <>
      <Collapse in={isDaiCloseToUsdc}>
        <Paper className={classes.warningPaper} variant="outlined">
          <Box p={2.5}>
            <Typography variant="h6" component="p">
              <Box color={theme.palette.warning.main}>WARNING</Box>
              DAI is close to its peg. Opening a short position will likely
              result in losses.
            </Typography>
          </Box>
        </Paper>
      </Collapse>

      <Box height={16} />

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
                <Typography variant="h6">Borrowing (DAI)</Typography>
                <Typography color="error">{borrowingStr}</Typography>
              </Box>
            </Box>

            <Box mt={2} textAlign="center">
              <Typography variant="h6">Stability Fee</Typography>
              <Typography>{stabilityApyStr}</Typography>
            </Box>
          </Collapse>
        </Box>
      </Paper>

      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          disabled={
            shortDaiState === ShortDaiState.PENDING ||
            shortDaiState === ShortDaiState.NOT_CONNECTED ||
            isApprovingUsdc ||
            isCreatingProxy ||
            isOpeningShort ||
            (shortDaiState === ShortDaiState.READY &&
              (!validUsdcPrincipal || !hasMinDaiAmount))
          }
          size="large"
          fullWidth
          onClick={async () => {
            if (shortDaiState === ShortDaiState.SETUP_PROXY) {
              await createProxy();
              await getShortDaiState();
              return;
            }

            if (shortDaiState === ShortDaiState.APPROVE_USDC) {
              await approveUsdc();
              await getShortDaiState();
              return;
            }

            if (shortDaiState === ShortDaiState.READY) {
              const usdcPrincipal6 = ethers.utils.parseUnits(usdcPrincipal, 6);

              // (Leverage - 10) because we're using "cents"
              // i.e. leverage 15 = x1.5
              // And because we wanna minus initial usdcPrincipal6
              await openShortDaiPosition(0, usdcPrincipal6, leverage - 10);
              await Promise.all([
                getShortDaiState(),
                getUsdcBalances(),
                getDaiUsdcRates(),
                getCdps(),
              ]);
              return;
            }
          }}
        >
          {shortDaiState === ShortDaiState.PENDING && "INTIALIZING"}
          {shortDaiState === ShortDaiState.NOT_CONNECTED &&
            "CONNECT WALLET TO CONTINUE"}
          {shortDaiState === ShortDaiState.SETUP_PROXY && "SETUP"}
          {shortDaiState === ShortDaiState.APPROVE_USDC && "APPROVE"}
          {shortDaiState === ShortDaiState.READY && !validUsdcPrincipal
            ? usdcPrincipal === ""
              ? "ENTER PRINCIPAL AMOUNT"
              : "INVALID PRINCIPAL AMOUNT"
            : null}
          {shortDaiState === ShortDaiState.READY &&
            validUsdcPrincipal &&
            !hasMinDaiAmount &&
            "MIN BORROW IS 100 DAI"}
          {shortDaiState === ShortDaiState.READY &&
            validUsdcPrincipal &&
            hasMinDaiAmount &&
            "OPEN"}
        </Button>
      </Box>
    </>
  );
};

export default TabCreate;

export const useStyles = makeStyles((theme) =>
  createStyles({
    leverage: {
      position: "relative",
      "&:after": {
        position: "absolute",
        content: "'x'",
        top: 0,
        right: -20,
        height: "100%",
        fontSize: 24,
        color: "grey",
        display: "flex",
        alignItems: "center",
      },
    },
    warningPaper: {
      border: `1px solid ${theme.palette.warning.main}`,
    },
  })
);
