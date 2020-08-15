import {
  Box,
  Button,
  InputBase,
  makeStyles,
  Paper,
  Slider,
  Typography,
  useTheme,
} from "@material-ui/core";
import { CONSTANTS } from "@shortdai/smart-contracts";
import { ethers } from "ethers";
import { useState, ChangeEvent } from "react";
import useContracts from "../containers/web3/use-contracts";
import useWeb3 from "../containers/web3/use-web3";

const useStyles = makeStyles({
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
});

const Main = () => {
  const classes = useStyles();
  const theme = useTheme();

  const { connect, isConnecting, connected } = useWeb3.useContainer();
  const { contracts } = useContracts.useContainer();
  const [amount, setAmount] = useState(null);
  const [inputAmount, setInputAmount] = useState("");
  const [cR, setCR] = useState(115);

  const getRates = async () => {
    const { IOneSplit } = contracts;

    console.log("fetching from oneinch...");

    console.log("OneSplit", IOneSplit);

    const { returnAmount } = await IOneSplit.getExpectedReturn(
      CONSTANTS.ERC20_ADDRESSES.DAI,
      CONSTANTS.ERC20_ADDRESSES.USDC,
      ethers.utils.parseUnits("1", CONSTANTS.ERC20_DECIMALS.DAI), // To Wei
      2,
      0
    );

    console.log("got from oneinch...");

    // Convert from Wei to Numbers
    const returnAmountFixed = ethers.utils.formatUnits(
      returnAmount,
      CONSTANTS.ERC20_DECIMALS.USDC
    );

    setAmount(returnAmountFixed);
  };

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
      <Box
        mx="auto"
        width={400}
        maxWidth="80%"
        bgcolor={theme.palette.background.paper}
        borderRadius={30}
        position="relative"
        p={4}
      >
        <img className={classes.pickle} src="/pickle.png" alt="pickle" />

        <Box p={1} mb={4} textAlign="center">
          <Typography variant="h5">1 DAI = 1.0083 USDC</Typography>
        </Box>

        <Paper variant="outlined">
          <Box px={2.5} py={2}>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="h6" component="p">
                Principal
              </Typography>

              <Typography variant="h6" component="p">
                Balance: 2.30723
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
              <Typography variant="h6">Levarage</Typography>
              <Typography variant="h3">
                {Number(1000 / cR).toFixed(2)}
                <Box
                  component="span"
                  color={theme.palette.text.disabled}
                  ml={0.5}
                >
                  <Typography component="span" variant="h5">
                    x
                  </Typography>
                </Box>
              </Typography>
            </Box>

            <Slider
              value={cR}
              onChange={(_, newValue) => setCR(newValue as number)}
              min={110}
              max={500}
            />
            <Box textAlign="center">
              <Typography variant="h5">{cR}%</Typography>
              <Typography variant="h6">Collateralization Ratio</Typography>
            </Box>
          </Box>
        </Paper>

        <Box mt={4}>
          {!connected ? (
            <Button
              variant="contained"
              color="primary"
              disabled={isConnecting}
              onClick={connect}
              size="large"
              fullWidth
            >
              {isConnecting ? "Connecting ..." : "Connect to Metamask"}
            </Button>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
};

export default Main;
