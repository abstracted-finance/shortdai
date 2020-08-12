export interface BotSettings {
  NETWORK: string; // @shortdai/smart-contracts/deployed/<network>, e.g."localhost", "mainnet"
  RPC_URL: string;
  PRIVATE_KEY: string;
  SHORT_DAI_LEVERAGE: number;
  OPEN_SHORT_DAI_RATIO: number;
  CLOSE_SHORT_DAI_RATIO: number;
  CDP_ID: number;
}
