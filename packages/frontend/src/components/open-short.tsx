import {
  Box,
  Button,
  InputBase,
  Paper,
  Slider,
  Typography,
} from "@material-ui/core";
import { ethers } from "ethers";
import { ChangeEvent, useEffect, useState } from "react";

import useCdps from "../containers/use-cdps";
import useContracts from "../containers/use-contracts";
import useWeb3 from "../containers/use-web3";
import useProxy from "../containers/use-proxy";
import useOpenShort from "../containers/use-open-short";
import useUsdc from "../containers/use-usdc";
import useShortDaiState, {
  ShortDaiState,
} from "../containers/use-shortdai-state";

import { useStyles } from "./styles";
import { CONSTANTS } from "@shortdai/smart-contracts";

const OpenShort = ({ cdpId, leverage, setLeverage }) => {
  const classes = useStyles();

  const { connected } = useWeb3.useContainer();
  const { contracts } = useContracts.useContainer();
  const { getCdpBorrowedSuppied } = useCdps.useContainer();
  const { openShortDaiPosition, isOpeningShort } = useOpenShort.useContainer();
  const { isCreatingProxy, createProxy } = useProxy.useContainer();
  const { usdcBal6, isApprovingUsdc, approveUsdc } = useUsdc.useContainer();
  const { shortDaiState } = useShortDaiState.useContainer();

  const [isGettingStats, setIsGettingStats] = useState<boolean>(false);
  const [borrowed, setBorrowed] = useState<ethers.BigNumber>(
    ethers.constants.Zero
  );
  const [supplied, setSupplied] = useState<ethers.BigNumber>(
    ethers.constants.Zero
  );
  const [usdcPrincipal, setUsdcPrincipal] = useState("");

  const usdcPrincipalBN = ethers.utils.parseUnits(
    usdcPrincipal || "0",
    CONSTANTS.ERC20_DECIMALS.USDC
  );
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

  const updateBorrowedSupplied = async () => {
    setIsGettingStats(true);

    if (cdpId === 0) {
      setSupplied(ethers.constants.Zero);
      setBorrowed(ethers.constants.Zero);
      return;
    }

    const { borrowed, supplied } = await getCdpBorrowedSuppied(cdpId);
    setSupplied(supplied);
    setBorrowed(borrowed);
    setIsGettingStats(false);
  };

  useEffect(() => {
    if (contracts === null) return;
    if (!connected) return;

    updateBorrowedSupplied();
  }, [connected, contracts, cdpId]);

  return (
    <>
      <Paper variant="outlined">
        <Box p={2.5}>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="h6" component="p">
              Supplied (USDC):
              <br />
              {isGettingStats ? "..." : ethers.utils.formatUnits(supplied, 18)}
            </Typography>

            <Typography variant="h6" component="p">
              Borrowed (DAI):
              <br />
              {isGettingStats ? "..." : ethers.utils.formatUnits(borrowed, 18)}
            </Typography>
          </Box>
        </Box>
      </Paper>

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
            <Box flex={1}>
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

          <Box height={32} />

          <Box textAlign="center">
            <Typography variant="h6">Leverage</Typography>
            <Typography
              component="span"
              variant="h3"
              className={classes.leverage}
            >
              {(leverage / 10).toString()}
            </Typography>
          </Box>

          <Slider
            value={leverage}
            onChange={(_, newValue: number) => {
              setLeverage(newValue);
            }}
            min={11}
            max={109}
          />
          <Box textAlign="center">
            <Typography variant="h5">
              {((leverage / (leverage - 10)) * 100).toFixed(2)}%
            </Typography>
            <Typography variant="h6">Collateralization Ratio</Typography>
          </Box>
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
            !validUsdcPrincipal
          }
          size="large"
          fullWidth
          onClick={() => {
            if (shortDaiState === ShortDaiState.SETUP_PROXY) {
              createProxy();
              return;
            }

            if (shortDaiState === ShortDaiState.APPROVE_USDC) {
              approveUsdc();
              return;
            }

            if (shortDaiState === ShortDaiState.READY) {
              const usdcPrincipal6 = ethers.utils.parseUnits(usdcPrincipal, 6);

              // (Leverage - 10) because we're using "cents"
              // i.e. leverage 15 = x1.5
              // And because we wanna minus initial usdcPrincipal6
              openShortDaiPosition(cdpId, usdcPrincipal6, leverage - 10);
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

export default OpenShort;
