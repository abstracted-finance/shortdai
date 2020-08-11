import { ethers } from "ethers";
import { getEthersContracts, CONSTANTS } from "@shortdai/smart-contracts";

import { getSettings } from "./src/settings";

const { CONTRACT_ADDRESSES } = CONSTANTS;

const { NETWORK, RPC_URL, PRIVATE_KEY } = getSettings();

const network = NETWORK;
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const {
  IDSProxy,
  IOneSplit,
  ICurveFiCurve,
  OpenShortDAI,
  CloseShortDAI,
  ShortDAIActions,
  VaultPositionReader,
} = getEthersContracts(network, wallet);
const ICurveSUSD = ICurveFiCurve.attach(CONTRACT_ADDRESSES.CurveFiSUSDv2);

// Event listener, listens every block
provider.on("block", (blockNumber) => {
  console.log("New Block: " + blockNumber);
});
