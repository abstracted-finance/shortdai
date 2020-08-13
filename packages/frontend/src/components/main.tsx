import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONSTANTS } from "@shortdai/smart-contracts";

import useWeb3 from "../containers/web3/use-web3";
import useContracts from "../containers/web3/use-contracts";
import { Box, Button, makeStyles } from "@material-ui/core";

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

  const { connect, isConnecting, connected } = useWeb3.useContainer();
  const { contracts } = useContracts.useContainer();
  const [amount, setAmount] = useState(null);

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

  return (
    <Box height="100vh" pt={20} overflow="hidden">
      <Box
        mx="auto"
        width={400}
        maxWidth="80%"
        height={388}
        bgcolor="rgb(33, 36, 41)"
        borderRadius={30}
        position="relative"
      >
        <img className={classes.pickle} src="/pickle.png" alt="pickle" />
        {!connected ? (
          <Button disabled={connected} onClick={connect}>
            Connect to Metamask
          </Button>
        ) : null}

        {connected ? (
          <Button
            onClick={() => {
              setAmount(null);
              getRates();
            }}
          >
            Fetch
          </Button>
        ) : null}

        <br />
        <div>1 DAI returns {(amount || "???").toString()} USDC</div>
      </Box>
    </Box>
  );
};

export default Main;
