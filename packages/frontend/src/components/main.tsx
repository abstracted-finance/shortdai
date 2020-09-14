import {
  Box,
  Button,
  Collapse,
  createStyles,
  Fade,
  ListItemIcon,
  makeStyles,
  Menu,
  MenuItem,
  Paper,
  Typography,
  useTheme,
} from "@material-ui/core";
import Contracts from "@shortdai/smart-contracts/deployed/mainnet/deployed.json";
import cn from "classnames";
import { ethers } from "ethers";
import { useState } from "react";
import useCdps from "../containers/use-cdps";
import useUsdc from "../containers/use-usdc";
import useWeb3 from "../containers/use-web3";
import { ConnectButton } from "./connect-button";
import { useMobile } from "./hooks";
import TabCreate, { LEVERAGE_MAX, LEVERAGE_MIN } from "./tab-create";
import TabManage from "./tab-manage";

enum Tabs {
  CREATE,
  MANAGE,
}

const Main = () => {
  const classes = useStyles();
  const theme = useTheme();
  const isMobile = useMobile();

  const { cdps } = useCdps.useContainer();
  const { connected, isConnecting, connect } = useWeb3.useContainer();
  const { daiUsdcRatio6 } = useUsdc.useContainer();

  const [
    contractsMenuAnchor,
    setContractsMenuAnchor,
  ] = useState<HTMLButtonElement | null>(null);
  const [leverage, setLeverage] = useState<number>(100);
  const [selectedTab, setSelectedTab] = useState<Tabs>(Tabs.CREATE);

  function handleContractsMenuClick(
    event: React.MouseEvent<HTMLButtonElement>
  ) {
    setContractsMenuAnchor(event.currentTarget);
  }

  function handleExternalLink(url: string, prefixEtherscan = false) {
    return () => {
      window.open(
        (prefixEtherscan ? "https://etherscan.io/address/" : "") + url,
        "_blank"
      );
    };
  }

  return (
    <>
      <Box position="absolute" right={0} py={1} px={2} display="flex">
        <Button
          onClick={handleContractsMenuClick}
          startIcon={<img src="/etherscan.png" width={18} height={18} />}
        >
          Contracts
        </Button>
        <Menu
          anchorEl={contractsMenuAnchor}
          open={!!contractsMenuAnchor}
          onClose={() => setContractsMenuAnchor(null)}
          TransitionComponent={Fade}
        >
          {Object.keys(Contracts).map((key) => (
            <MenuItem
              key={key}
              onClick={handleExternalLink(Contracts[key].address, true)}
            >
              <ListItemIcon>
                <img src="/open-in-new.png" />
              </ListItemIcon>

              <Box ml={-3}>{key}</Box>
            </MenuItem>
          ))}
        </Menu>

        <Box width={16} />

        <Button
          onClick={handleExternalLink(
            "https://github.com/abstracted-finance/shortdai"
          )}
          startIcon={<img src="/github.png" width={18} height={18} />}
        >
          <Box display="flex" alignItems="center">
            repo
          </Box>
        </Button>
      </Box>

      <Box className={classes.root} minHeight="100vh" py={isMobile ? 16 : 20}>
        <Box
          mx="auto"
          width="90%"
          maxWidth={450}
          position="relative"
          zIndex={1}
        >
          <Box
            width="100%"
            bgcolor={theme.palette.background.paper}
            borderRadius={30}
            p={isMobile ? 2 : 4}
            position="relative"
            zIndex={1}
          >
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
              transform: `translate(${50 * ((leverage - LEVERAGE_MIN) / LEVERAGE_MAX)}%, -${
                46 * ((leverage - LEVERAGE_MIN) / LEVERAGE_MAX)
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
    </>
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
    tokenIcon: {
      marginLeft: 4,
      width: 24,
      height: 24,
    },
  })
);
