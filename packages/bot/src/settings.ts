import { ethers } from "ethers";
import { debug } from "./logging";
import { BotSettings } from "./types";

export const getSettings = (): BotSettings => {
  const NETWORK = process.env.NETWORK || "localhost";
  const RPC_URL = process.env.RPC_URL || "http://localhost:8545";
  const PRIVATE_KEY =
    process.env.SHORT_DAI_PRIVATE_KEY ||
    "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d";
  const SHORT_DAI_LEVERAGE = parseFloat(process.env.SHORT_DAI_LEVERAGE) || 10;
  const OPEN_SHORT_DAI_RATIO =
    parseFloat(process.env.OPEN_SHORT_DAI_RATIO) || 1.025;
  const CLOSE_SHORT_DAI_RATIO =
    parseFloat(process.env.CLOSE_SHORT_DAI_RATIO) || 1.01;
  const CDP_ID = parseInt(process.env.CDP_ID) || 0;

  const w = new ethers.Wallet(PRIVATE_KEY);

  const envKeysAndValues = [
    ["NETWORK", NETWORK],
    ["RPC_URL", RPC_URL],
    ["SHORT_DAI_PRIVATE_KEY", `(public key) ${w.address}`],
    ["SHORT_DAI_LEVERAGE", SHORT_DAI_LEVERAGE],
    ["OPEN_SHORT_DAI_RATIO", OPEN_SHORT_DAI_RATIO],
    ["CLOSE_SHORT_DAI_RATIO", CLOSE_SHORT_DAI_RATIO],
    ["CDP_ID", CDP_ID],
  ];

  debug(`------------------------------------`);
  debug(`Environment variables`);
  for (const [k, v] of envKeysAndValues) {
    debug(`${k}: ${v}`);
  }
  debug(`------------------------------------`);

  return {
    NETWORK,
    RPC_URL,
    PRIVATE_KEY,
    OPEN_SHORT_DAI_RATIO,
    CLOSE_SHORT_DAI_RATIO,
    SHORT_DAI_LEVERAGE,
    CDP_ID,
  };
};
