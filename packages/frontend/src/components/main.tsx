import {
  Box,
  Button,
  createStyles,
  InputBase,
  makeStyles,
  Paper,
  Slider,
  Typography,
  useTheme,
} from "@material-ui/core";
import { CONSTANTS } from "@shortdai/smart-contracts";
import cn from "classnames";
import { ethers } from "ethers";
import { ChangeEvent, useEffect, useState } from "react";

import useProxy from "../containers/web3/use-proxy";
import useContracts from "../containers/web3/use-contracts";
import useWeb3 from "../containers/web3/use-web3";
import { CustomButton } from "./CustomButton";

const metamaskContainerHeight = 64;

const useStyles = makeStyles((theme) =>
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
    pickle: {
      position: "absolute",
      maxWidth: 300,
      width: "50%",
      top: 0,
      left: "50%",
      zIndex: -1,
    },
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
    tabButton: {
      fontSize: "1.75em",
      color: "#888D9B",
    },
    tabButtonActive: {
      fontSize: "1.75em",
      color: "#FFFFFF",
    },
    bottomDrawer: {
      transition: "transform 300ms ease-in-out",
      width: "85%",
      position: "relative",
      margin: "0 auto",
      transform: "translateY(-124px)",
      height: "100px",
      paddingTop: 24,
      backgroundColor: "transparent",
    },
    bottomDrawerShow: {
      transform: "translateY(-24px)",
    },
    withdraw: {
      backgroundColor: theme.palette.error.main,
    },
  })
);

enum Tabs {
  OPEN,
  CLOSE,
}

const Main = () => {
  const classes = useStyles();
  const theme = useTheme();

  const {
    ethAddress,
    connect,
    isConnecting,
    connected,
  } = useWeb3.useContainer();
  const { contracts } = useContracts.useContainer();
  const {
    hasProxy,
    proxy,
    proxyAddress,
    createProxy,
  } = useProxy.useContainer();

  const [selectedTab, setSelectedTab] = useState<Tabs>(Tabs.OPEN);

  const [daiUsdcRatio, setDaiUsdcRatio] = useState<null | string>(null);
  const [usdcBal, setUdscBal] = useState<null | string>(null);
  const [hasPosition, setHasPosition] = useState(false);

  const [hasApproved, setHasApproved] = useState<boolean>(false);
  const [inputAmount, setInputAmount] = useState("");
  const [sliderValue, setSliderValue] = useState<number>(80);

  const leverage = sliderValue / 10;

  const openShortDaiPosition = async () => {
    const { ShortDAIActions, OpenShortDAI } = contracts;

    const initialUsdcMargin = ethers.utils.parseUnits(
      inputAmount,
      CONSTANTS.ERC20_DECIMALS.USDC
    );

    const tenBN = ethers.BigNumber.from("10");
    const leverageBN = ethers.BigNumber.from(
      (leverage * 10).toFixed(0).toString()
    );

    const daiUsdcRatioBN = ethers.BigNumber.from(
      (parseFloat(daiUsdcRatio) * 1000).toFixed(0).toString()
    );
    const thousandBN = ethers.BigNumber.from("1000");

    const flashloanDaiAmount = ethers.utils
      .parseUnits(inputAmount, CONSTANTS.ERC20_DECIMALS.DAI)
      .mul(leverageBN)
      .div(tenBN)
      .mul(daiUsdcRatioBN)
      .div(thousandBN);

    console.log("initialUsdcMargin", initialUsdcMargin.toString());
    console.log("flashloanDaiAmount", flashloanDaiAmount.toString());

    const openCalldata = ShortDAIActions.interface.encodeFunctionData(
      "flashloanAndOpen",
      [
        OpenShortDAI.address,
        CONSTANTS.CONTRACT_ADDRESSES.ISoloMargin,
        CONSTANTS.CONTRACT_ADDRESSES.CurveFiSUSDv2,
        0,
        initialUsdcMargin,
        flashloanDaiAmount,
      ]
    );

    const openTx = await proxy[
      "execute(address,bytes)"
    ](ShortDAIActions.address, openCalldata, { gasLimit: 1000000 });
    await openTx.wait();
  };

  const approveProxyUsdc = async () => {
    const { IERC20 } = contracts;
    const USDC = IERC20.attach(CONSTANTS.ERC20_ADDRESSES.USDC);

    const tx = await USDC.approve(proxyAddress, ethers.constants.MaxUint256);
    await tx.wait();
  };

  const getUsdcApprovedAmount = async () => {
    const { IERC20 } = contracts;
    const USDC = IERC20.attach(CONSTANTS.ERC20_ADDRESSES.USDC);

    if (
      proxyAddress === ethers.constants.AddressZero ||
      proxyAddress === null
    ) {
      setHasApproved(false);
      return;
    }

    const approved = await USDC.allowance(ethAddress, proxyAddress);
    setHasApproved(approved.gt(ethers.constants.Zero));
  };

  const getDaiUsdcRates = async () => {
    const { ICurveFiCurve } = contracts;

    const ICurveFiSUSDv2 = ICurveFiCurve.attach(
      CONSTANTS.CONTRACT_ADDRESSES.CurveFiSUSDv2
    );

    // 0 = DAI
    // 1 = USDC
    const daiUsdcRatio = await ICurveFiSUSDv2.get_dy_underlying(
      0,
      1,
      ethers.utils.parseUnits("100000", CONSTANTS.ERC20_DECIMALS.DAI)
    );

    const daiUsdcRatioNormalized = daiUsdcRatio.div(
      ethers.BigNumber.from(100000)
    );

    // Convert from Wei to Numbers
    const daiUsdcRatioFixed = parseFloat(
      ethers.utils.formatUnits(
        daiUsdcRatioNormalized,
        CONSTANTS.ERC20_DECIMALS.USDC
      )
    )
      .toFixed(3)
      .toString();

    setDaiUsdcRatio(daiUsdcRatioFixed);
  };

  const getUsdcBalances = async () => {
    const { IERC20 } = contracts;
    const USDC = IERC20.attach(CONSTANTS.ERC20_ADDRESSES.USDC);

    // Balance in 6 decimals
    const bal6 = await USDC.balanceOf(ethAddress);

    // Convert to readable
    const bal = ethers.utils.formatUnits(bal6, CONSTANTS.ERC20_DECIMALS.USDC);

    setUdscBal(bal);
  };

  useEffect(() => {
    if (contracts === null) return;
    if (!connected) return;
    if (proxyAddress === null) return;

    getDaiUsdcRates();
    getUsdcBalances();
    getUsdcApprovedAmount();
  }, [contracts, connected, proxyAddress]);

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const {
      target: { value },
    } = event;
    if (/^[0-9]*[.,]?[0-9]*$/.test(value)) {
      setInputAmount(value);
    }
  }

  return (
    <Box height="100vh" pt={20} overflow="hidden">
      <Box mx="auto" width={500} maxWidth="80%" position="relative" zIndex={1}>
        <img
          className={classes.pickle}
          src="/pickle.png"
          alt="pickle"
          style={{
            transform: `translate(${32 * (leverage / 11)}%, -${
              30 * (leverage / 11)
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
              1.000 DAI = {daiUsdcRatio === null ? "..." : daiUsdcRatio} USDC
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

          <Paper variant="outlined">
            <Box p={2.5}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="h6" component="p">
                  Principal
                </Typography>

                <Typography variant="h6" component="p">
                  Balance: {usdcBal === null ? "..." : usdcBal}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center">
                <Box flex={1}>
                  <InputBase
                    placeholder="0.0"
                    value={inputAmount}
                    onChange={handleInputChange}
                  />
                </Box>

                <Button
                  onClick={() => {
                    if (usdcBal === null) return;
                    setInputAmount(usdcBal);
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
                  {leverage.toString()}
                </Typography>
              </Box>

              <Slider
                value={sliderValue}
                onChange={(_, newValue: number) => {
                  setSliderValue(newValue);
                }}
                min={11}
                max={109}
              />
              <Box textAlign="center">
                <Typography variant="h5">
                  {((leverage / (leverage - 1)) * 100).toFixed(2)}%
                </Typography>
                <Typography variant="h6">Collateralization Ratio</Typography>
              </Box>
            </Box>
          </Paper>

          {hasProxy ? (
            <Box mt={2} display="flex">
              {hasApproved ? (
                <Button
                  variant="contained"
                  color="primary"
                  disabled={
                    !inputAmount ||
                    !hasProxy ||
                    parseFloat(inputAmount) === 0.0 ||
                    parseFloat(inputAmount) > parseFloat(usdcBal)
                  }
                  size="large"
                  fullWidth
                  onClick={() => openShortDaiPosition()}
                  className={cn({ [classes.withdraw]: hasPosition })}
                >
                  OPEN
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  disabled={!hasProxy && hasApproved}
                  size="large"
                  fullWidth
                  onClick={async () => {
                    await approveProxyUsdc();
                    await getUsdcApprovedAmount();
                  }}
                  className={cn({ [classes.withdraw]: hasPosition })}
                >
                  APPROVE
                </Button>
              )}
            </Box>
          ) : (
            <Box mt={2}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                disabled={!connected}
                onClick={() => createProxy()}
                className={cn({ [classes.withdraw]: hasPosition })}
              >
                Setup
              </Button>
            </Box>
          )}
        </Box>

        <Paper
          variant="outlined"
          className={cn(classes.bottomDrawer, {
            [classes.bottomDrawerShow]: !connected,
          })}
        >
          <Box p={2}>
            <CustomButton
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
            </CustomButton>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default Main;
