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
import useContracts from "../containers/web3/use-contracts";
import useWeb3 from "../containers/web3/use-web3";
import { CustomButton } from "./customButton";

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
      transform: "translate(35%, -36%)",
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

const Main = () => {
  const classes = useStyles();
  const theme = useTheme();

  const {
    signer,
    ethAddress,
    connect,
    isConnecting,
    connected,
  } = useWeb3.useContainer();
  const { contracts } = useContracts.useContainer();

  const [daiUsdcRatio, setDaiUsdcRatio] = useState<null | string>(null);
  const [usdcBal, setUdscBal] = useState<null | string>(null);
  const [hasPosition, setHasPosition] = useState(false);
  const [justConnected, setJustConnected] = useState(false);

  const [inputAmount, setInputAmount] = useState("");

  const [cR, setCR] = useState(115);
  const maxCR = 1000;

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

    setTimeout(() => {
      getDaiUsdcRates();
      getUsdcBalances();
    }, 1000);
  }, [contracts, connected]);

  useEffect(() => {
    if (connected) {
      setJustConnected(true);
      setTimeout(() => {
        setJustConnected(false);
      }, 1000);
    }
  }, [connected]);

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
      <Box mx="auto" width={400} maxWidth="80%" position="relative" zIndex={1}>
        <img className={classes.pickle} src="/pickle.png" alt="pickle" />

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

                <Button variant="outlined" size="small" color="primary">
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
                  {Number(maxCR / cR).toFixed(2)}
                </Typography>
              </Box>

              <Slider
                value={cR * -1}
                onChange={(_, newValue) => setCR((newValue as number) * -1)}
                min={-maxCR}
                max={-110}
              />
              <Box textAlign="center">
                <Typography variant="h5">{cR}%</Typography>
                <Typography variant="h6">Collateralization Ratio</Typography>
              </Box>
            </Box>
          </Paper>

          <Box mt={4}>
            <Button
              variant="contained"
              color="primary"
              disabled={!inputAmount}
              size="large"
              fullWidth
              onClick={() => setHasPosition(!hasPosition)}
              className={cn({ [classes.withdraw]: hasPosition })}
            >
              {hasPosition ? "CLOSE POSITION" : "OPEN SHORT POSITION"}
            </Button>
          </Box>
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
              {justConnected
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
