import { Page, Button } from "@zeit-ui/react";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONSTANTS } from "@shortdai/smart-contracts";

import useWeb3 from "../containers/web3/use-web3";
import useContracts from "../containers/web3/use-contracts";

const Main = () => {
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
    <Page>
      <h1>OneInch stats</h1>

      {!connected ? (
        <Button loading={isConnecting} disabled={connected} onClick={connect}>
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
    </Page>
  );
};

export default Main;
