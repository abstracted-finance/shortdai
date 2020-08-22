import {
  Box,
  Button,
  Collapse,
  createStyles,
  makeStyles,
  Paper,
  Typography,
  useMediaQuery,
  useTheme,
} from "@material-ui/core";
import cn from "classnames";
import { ethers } from "ethers";
import { useState } from "react";
import useCdps from "../containers/use-cdps";
import useUsdc from "../containers/use-usdc";
import useWeb3 from "../containers/use-web3";
import { ConnectButton } from "./connect-button";
import TabCreate from "./tab-create";
import TabManage from "./tab-manage";

enum Tabs {
  CREATE,
  MANAGE,
}

const Main = () => {
  const classes = useStyles();
  const theme = useTheme();
  const isDesktop = useMediaQuery("(min-width:600px)");

  const { cdps } = useCdps.useContainer();
  const { connected, isConnecting, connect } = useWeb3.useContainer();
  const { daiUsdcRatio6 } = useUsdc.useContainer();

  const [leverage, setLeverage] = useState<number>(69);
  const [selectedTab, setSelectedTab] = useState<Tabs>(Tabs.CREATE);

  return (
    <Box className={classes.root} minHeight="100vh" py={isDesktop ? 20 : 8}>
      <Box mx="auto" width={450} maxWidth="90%" position="relative" zIndex={1}>
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

          <Collapse in={selectedTab === Tabs.CREATE}>
            <TabCreate leverage={leverage} setLeverage={setLeverage} />
          </Collapse>

          <Collapse in={selectedTab === Tabs.MANAGE}>
            <TabManage />
          </Collapse>
        </Box>

        <img
          className={classes.pickle}
          src="/pickle.png"
          alt="pickle"
          style={{
            transform: `translate(${41 * ((leverage - 11) / 89)}%, -${
              37 * ((leverage - 11) / 89)
            }%)`,
          }}
        />

        <Box className={cn(classes.drawer, classes.topDrawer)} display="flex">
          <Box display="flex">
            <Button
              variant="outlined"
              onClick={() => setSelectedTab(Tabs.CREATE)}
              size="large"
              className={cn(classes.tabButton, {
                [classes.tabButtonActive]: selectedTab === Tabs.CREATE,
              })}
            >
              CREATE
            </Button>

            <Button
              variant="outlined"
              onClick={() => setSelectedTab(Tabs.MANAGE)}
              size="large"
              className={cn(classes.tabButton, {
                [classes.tabButtonActive]: selectedTab === Tabs.MANAGE,
              })}
            >
              MANAGE{cdps.length ? ` (${cdps.length})` : ""}
            </Button>
          </Box>
        </Box>

        <Paper
          variant="outlined"
          className={cn(classes.drawer, classes.bottomDrawer, {
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

export const useStyles = makeStyles((theme) =>
  createStyles({
    "@global": {
      body: {
        backgroundColor: "rgb(44, 47, 54)",
        backgroundImage:
          "radial-gradient(50% 50% at 50% 50%, rgba(33, 114, 229, 0.1) 0%, rgba(33, 36, 41, 0) 100%)",
        backgroundRepeat: "no-repeat",
        backgroundPosition: `0 -30vh`,
      },
    },
    root: {
      overflowX: "hidden",
    },
    pickle: {
      position: "absolute",
      maxWidth: 300,
      width: "50%",
      top: 0,
      left: "50%",
      zIndex: -1,
    },
    drawer: {
      position: "absolute",
      transition: "transform 300ms ease-in-out",
    },
    topDrawer: {
      top: -36,
      left: 32,
    },
    bottomDrawer: {
      backgroundColor: "transparent",
      left: "50%",
      width: "85%",
      transform: "translate(-50%, -124px)",
      height: "100px",
      paddingTop: 24,
    },
    bottomDrawerShow: {
      transform: "translate(-50%, -24px)",
    },
    tabButton: {
      boxSizing: "content-box",
      transition: "margin 300ms ease-in-out",
      paddingBottom: 16,
      borderRadius: 8,
      color: theme.palette.text.hint,
      "&:first-child": {
        borderRightWidth: 0,
      },
      "&:last-child": {
        borderLeftWidth: 0,
      },
    },
    tabButtonActive: {
      marginTop: -12,
      border: 0,
      backgroundColor: theme.palette.background.paper + " !important",
    },
  })
);
