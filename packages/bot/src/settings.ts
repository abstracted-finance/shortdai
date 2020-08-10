import { warn } from "./logging";
import { BotSettings } from "./types";

export const getSettings = (): BotSettings => {
  const NETWORK = process.env.NETWORK || "localhost";
  const RPC_URL = process.env.RPC_URL || "http://localhost:8545";
  const PRIVATE_KEY =
    process.env.SHORT_DAI_SK ||
    "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d";

  if (!process.env.NETWORK) {
    warn(`NETWORK environment variable not found, defaulting to localhost`);
  }

  if (!process.env.RPC_URL) {
    warn(
      `RPC_URL environment variable not found, defaulting to http://localhost:8545`
    );
  }

  if (!process.env.SHORT_DAI_SK) {
    warn(
      `SHORT_DAI_SK environment variable not found, defaulting to deterministic private key`
    );
  }

  return {
    NETWORK,
    RPC_URL,
    PRIVATE_KEY,
  };
};
