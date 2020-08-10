import { ethers } from "ethers";

export interface BotSettings {
  NETWORK: string; // @shortdai/smart-contracts/deployed/<network>, e.g."localhost", "mainnet"
  RPC_URL: string;
  PRIVATE_KEY: string;
}

export interface BotContracts {
  IERC20: ethers.Contract;
  IDSProxy: ethers.Contract;
  IOneSplit: ethers.Contract;
  ICurveFiCurve: ethers.Contract;
  IProxyRegistry: ethers.Contract;
  OpenShortDAI: ethers.Contract;
  CloseShortDAI: ethers.Contract;
  OpenShortDAIActions: ethers.Contract;
  CloseShortDAIActions: ethers.Contract;
  VaultPositionReader: ethers.Contract;
}
