import {
  Box,
  Button,
  Paper,
  Typography,
  useTheme,
  Select,
  MenuItem,
  FormControl,
} from "@material-ui/core";
import { ethers } from "ethers";
import cn from "classnames";
import { useState } from "react";

import useWeb3 from "../containers/use-web3";
import useUsdc from "../containers/use-usdc";
import useCdps from "../containers/use-cdps";
import useSelectedCdp from "../containers/use-selected-cdp";

import CloseShort from "./close-short";
import OpenShort from "./open-short";
import { ConnectButton } from "./connect-button";
import { useStyles } from "./styles";

enum Tabs {
  OPEN,
  CLOSE,
}

const Main = () => {
  const classes = useStyles();
  const theme = useTheme();

  const { isGettingCdps, cdps } = useCdps.useContainer();
  const { connected, isConnecting, connect } = useWeb3.useContainer();
  const { daiUsdcRatio6 } = useUsdc.useContainer();
  const {
    cdpId,
    setCdpId,
    cdpStats,
    isGettingCdpStats,
  } = useSelectedCdp.useContainer();

  const [leverage, setLeverage] = useState<number>(80);
  const [selectedTab, setSelectedTab] = useState<Tabs>(Tabs.OPEN);

  return (
    <Box height="100vh" pt={20} overflow="hidden">
      <Box mx="auto" width={450} maxWidth="80%" position="relative" zIndex={1}>
        <img
          className={classes.pickle}
          src="/pickle.png"
          alt="pickle"
          style={{
            transform: `translate(${32 * (leverage / 110)}%, -${
              30 * (leverage / 110)
            }%)`,
          }}
        />

        <Box
          width="100%"
          bgcolor={theme.palette.background.paper}
          borderRadius={30}
          p={4}
          position="relative"
          zIndex={1}
        >
          <Box p={1} mb={4} textAlign="center">
            <Typography variant="h5">
              1.000 DAI ={" "}
              {daiUsdcRatio6 === null
                ? "..."
                : ethers.utils.formatUnits(daiUsdcRatio6, 6)}{" "}
              USDC
            </Typography>
          </Box>

          <Box marginBottom={1.5} mt={2} display="flex">
            <Button
              className={
                selectedTab === Tabs.OPEN
                  ? classes.tabButtonActive
                  : classes.tabButton
              }
              onClick={() => setSelectedTab(Tabs.OPEN)}
              size="small"
              fullWidth
            >
              OPEN
            </Button>

            <Box width={32} />

            <Button
              className={
                selectedTab === Tabs.CLOSE
                  ? classes.tabButtonActive
                  : classes.tabButton
              }
              onClick={() => setSelectedTab(Tabs.CLOSE)}
              size="small"
              fullWidth
            >
              CLOSE
            </Button>
          </Box>

          <Box height={1} />

          <Box mb={4}>
            <FormControl style={{ width: "100%" }}>
              <Select
                value={cdpId}
                onChange={(e: any) => setCdpId(e.target.value)}
              >
                {cdps.map((x) => {
                  return <MenuItem value={x.cdpId}>{x.cdpId}</MenuItem>;
                })}
                {selectedTab === Tabs.OPEN ? (
                  <MenuItem value={0}>New CDP</MenuItem>
                ) : null}
              </Select>
            </FormControl>
          </Box>

          {selectedTab === Tabs.OPEN ? (
            <OpenShort leverage={leverage} setLeverage={setLeverage} />
          ) : null}

          {selectedTab === Tabs.CLOSE ? <CloseShort /> : null}
        </Box>

        <Paper
          variant="outlined"
          className={cn(classes.bottomDrawer, {
            [classes.bottomDrawerShow]: !connected,
          })}
        >
          <Box p={2}>
            <ConnectButton
              fullWidth
              name="metamask"
              variant="outlined"
              disabled={isConnecting}
              onClick={connect}
            >
              {connected
                ? "CONNECTED!"
                : isConnecting
                ? "CONNECTING ..."
                : "CONNECT"}
            </ConnectButton>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default Main;
