import {
  Box,
  Button,
  Collapse,
  createStyles,
  InputBase,
  makeStyles,
  Paper,
  Slider,
  Typography,
} from "@material-ui/core";
import { CONSTANTS } from "@shortdai/smart-contracts";
import { ethers } from "ethers";
import { ChangeEvent, useState, useEffect } from "react";
import useCdps from "../containers/use-cdps";
import useMakerStats from "../containers/use-maker-stats";
import useOpenShort from "../containers/use-open-short";
import usePrices from "../containers/use-prices";
import useProxy from "../containers/use-proxy";
import useShortDaiState, {
  ShortDaiState,
} from "../containers/use-shortdai-state";
import useUsdc from "../containers/use-usdc";
import { useMobile } from "./hooks";
import LabelValue from "./label-value";
import { OutlinedPaper } from "./outlined-paper";
import { theme } from "./theme";
import { prettyStringDecimals } from "./utils";

const TabCreate = ({ leverage, setLeverage }) => {
  const isMobile = useMobile();
  const classes = useStyles();

  const { stabilityApy } = useMakerStats.useContainer();
  const {
    getMintAmountDai,
    openShortDaiPosition,
    isOpeningShort,
  } = useOpenShort.useContainer();
  const { isCreatingProxy, createProxy } = useProxy.useContainer();
  const {
    usdcBal6,
    isApprovingUsdc,
    approveUsdc,
    getDaiUsdcRates,
    getUsdcBalances,
  } = useUsdc.useContainer();
  const { getShortDaiState, shortDaiState } = useShortDaiState.useContainer();
  const { getCdps } = useCdps.useContainer();
  const { prices, getDaiUsdcRatio } = usePrices.useContainer();

  // Just so the collapse thing doesn't constantly collapse
  const [lastPrices, setLastPrices] = useState(prices);
  useEffect(() => {
    if (!prices) return;

    setLastPrices({ ...prices });
  }, [prices]);

  let daiUsdcRatio6 = ethers.constants.Zero;
  if (lastPrices) {
    daiUsdcRatio6 = ethers.utils.parseUnits(
      prettyStringDecimals(
        lastPrices.daiUsdcRatio,
        CONSTANTS.ERC20_DECIMALS.USDC
      ),
      CONSTANTS.ERC20_DECIMALS.USDC
    );
  }

  const [usdcPrincipal, setUsdcPrincipal] = useState("");

  const usdcPrincipalBN = ethers.utils.parseUnits(
    usdcPrincipal || "0",
    CONSTANTS.ERC20_DECIMALS.USDC
  );

  const flashloanDaiAmount = getMintAmountDai(
    usdcPrincipalBN,
    leverage,
    daiUsdcRatio6
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

  const zeroFlashloan = flashloanDaiAmount.eq(ethers.constants.Zero);
  const newCR = zeroFlashloan
    ? 0.0
    : parseFloat(
        toSupplyUsdcAmount
          .mul(ethers.utils.parseUnits("1", 12)) // Convert to 18 decimals
          .mul(ethers.BigNumber.from(100000)) // Multiply by 100000 so we can get decimals (in bignumbers)
          .div(flashloanDaiAmount)
          .toString()
      ) / 1000;
  const newCRStr = prettyStringDecimals(newCR.toString()) + "%";

  const liqPrice = zeroFlashloan ? 0.0 : 110 / newCR;
  const liqPriceStr = "$" + prettyStringDecimals(liqPrice.toString(), 4);

  const stabilityApyStr =
    stabilityApy === null ? "..." : (stabilityApy * 100).toFixed(2) + "%";

  const validUsdcPrincipal =
    usdcPrincipalBN.lte(usdcBal6 || ethers.constants.Zero) &&
    usdcPrincipalBN.gt(ethers.constants.Zero);

  // Estimated returns
  const estimatedReturnsString = ethers.utils.formatUnits(
    flashloanDaiAmount
      .mul(daiUsdcRatio6)
      .div(ethers.utils.parseUnits("1", 6))
      .sub(flashloanDaiAmount),
    18
  );

  // < 1% difference
  const daiUsdcBalApproximated6 = daiUsdcRatio6.eq(ethers.constants.Zero)
    ? null
    : daiUsdcRatio6
        .div(ethers.utils.parseUnits("1", 4))
        .mul(ethers.utils.parseUnits("1", 4));

  const isDaiCloseToUsdc =
    daiUsdcBalApproximated6 === null
      ? false
      : daiUsdcBalApproximated6.eq(ethers.utils.parseUnits("1", 6));

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const {
      target: { value },
    } = event;
    if (/^[0-9]*[.,]?[0-9]*$/.test(value)) {
      setUsdcPrincipal(value);

      if (flashloanDaiAmount.gt(ethers.constants.Zero)) {
        getDaiUsdcRatio(flashloanDaiAmount);
      }
    }
  }

  return (
    <>
      <Typography variant="h5">
        <Box
          p={1}
          mb={isMobile ? 2 : 4}
          display="flex"
          justifyContent="center"
          alignItems="center"
        >
          1
          <img src="/dai.png" className={classes.tokenIcon} />{" "}
          <Box mx={1.5}>=</Box>
          {prices === null
            ? "..."
            : prettyStringDecimals(prices.daiUsdcRatio, 4)}{" "}
          <img src="/usdc.png" className={classes.tokenIcon} />
        </Box>
      </Typography>

      <Collapse
        in={
          !isDaiCloseToUsdc &&
          !daiUsdcRatio6.eq(ethers.constants.Zero) &&
          daiUsdcRatio6.gt(
            ethers.utils.parseUnits("1", CONSTANTS.ERC20_DECIMALS.USDC)
          )
        }
      >
        <>
          <OutlinedPaper color="success">
            <Typography variant="h6" component="p">
              DAI is trading at a premium, consider opening a short position.
            </Typography>
          </OutlinedPaper>
          <Box height={16} />
        </>
      </Collapse>

      <Collapse in={isDaiCloseToUsdc}>
        <>
          <OutlinedPaper color="warning">
            <Typography variant="h6" component="p">
              DAI is close to its peg, consider closing your positions and hold
              off on opening new ones.
            </Typography>
          </OutlinedPaper>
          <Box height={16} />
        </>
      </Collapse>

      <OutlinedPaper>
        <Box display="flex" justifyContent="space-between">
          <Typography variant="h6" component="p">
            Deposit
          </Typography>

          <Typography variant="h6" component="p">
            Balance:{" "}
            {usdcBal6 === null ? "..." : ethers.utils.formatUnits(usdcBal6, 6)}
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

              // Approx, should be fine
              setUsdcPrincipal(ethers.utils.formatUnits(usdcBal6, 6));
              const dai = getMintAmountDai(usdcBal6, leverage, daiUsdcRatio6);
              getDaiUsdcRatio(dai);
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

          <Slider
            value={leverage}
            onChange={(_, newValue: number) => {
              setLeverage(newValue);
              // Aprox, should be alright
              try {
                const usdcPrincipal6 = ethers.utils.parseUnits(
                  usdcPrincipal,
                  6
                );
                const dai = getMintAmountDai(
                  usdcPrincipal6,
                  newValue,
                  daiUsdcRatio6
                );
                getDaiUsdcRatio(dai);
              } catch (e) {}
            }}
            min={11}
            max={100}
          />
        </Box>

        <Collapse in={shortDaiState === ShortDaiState.READY && hasMinDaiAmount}>
          <Box mt={2}>
            <Box
              display="flex"
              justifyContent={isMobile ? "space-between" : "space-around"}
            >
              <LabelValue label="Collat. Ratio">{newCRStr}</LabelValue>
              <LabelValue label="USDC Liq. Price">{liqPriceStr}</LabelValue>
              <LabelValue label="Stability Fee">{stabilityApyStr}</LabelValue>
            </Box>

            <Box
              mt={2}
              display="flex"
              justifyContent={isMobile ? "space-between" : "space-around"}
              alignItems="center"
            >
              <LabelValue label="Supplying" icon="usdc">
                {supplyingStr}
              </LabelValue>

              <Box mt={1} px={2} textAlign="center">
                <img src="/maker.png" width={48} />
              </Box>

              <LabelValue label="Borrowing" icon="dai">
                {borrowingStr}
              </LabelValue>
            </Box>

            <Box mt={2}>
              <LabelValue
                color={theme.palette.primary.main}
                label="Estimated returns, if 1:1"
                icon="usdc"
              >
                <Box fontSize={22}>
                  {prettyStringDecimals(estimatedReturnsString, 2)}
                </Box>
              </LabelValue>
            </Box>
          </Box>
        </Collapse>
      </OutlinedPaper>

      <Collapse in={leverage > 80 && stabilityApy > 0}>
        <Box mt={2}>
          <Paper className={classes.errorPaper} variant="outlined">
            <Box p={2.5}>
              <Typography variant="h6" component="p">
                <Box color={theme.palette.error.main}>DANGER</Box>
                Stability fees are non-zero. Potential liquidation penalties
                might apply if position is left opened for too long.
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Collapse>

      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          disabled={
            prices === null ||
            shortDaiState === ShortDaiState.PENDING ||
            shortDaiState === ShortDaiState.NOT_CONNECTED ||
            isApprovingUsdc ||
            isCreatingProxy ||
            isOpeningShort ||
            (shortDaiState === ShortDaiState.READY &&
              (!validUsdcPrincipal || !hasMinDaiAmount))
          }
          startIcon={
            shortDaiState === ShortDaiState.SETUP_PROXY && (
              <img src="/maker-white.png" height={32} />
            )
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

              // i.e. leverage 15 = x1.5
              // And because we wanna minus initial usdcPrincipal6
              await openShortDaiPosition(
                0,
                usdcPrincipal6,
                leverage,
                daiUsdcRatio6
              );
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
          {shortDaiState === ShortDaiState.PENDING && "Initializing..."}
          {shortDaiState === ShortDaiState.NOT_CONNECTED &&
            "Connect wallet to continue"}
          {shortDaiState === ShortDaiState.SETUP_PROXY && "Setup Vault"}
          {shortDaiState === ShortDaiState.APPROVE_USDC && "Approve USDC"}

          {shortDaiState === ShortDaiState.READY &&
            (usdcPrincipal === ""
              ? "Enter deposit"
              : hasMinDaiAmount
              ? validUsdcPrincipal
                ? "Open short position"
                : "Invalid deposit"
              : "Min. borrow is 100 DAI")}
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
    errorPaper: {
      border: `1px solid ${theme.palette.error.main}`,
    },
    successPaper: {
      border: `1px solid ${theme.palette.success.main}`,
    },
    tokenIcon: {
      width: 20,
      height: 20,
      marginLeft: 4,
    },
  })
);
