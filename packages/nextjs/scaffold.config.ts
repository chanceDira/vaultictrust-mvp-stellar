import type { Address } from "viem";
import * as chains from "viem/chains";

export type ProxyContractAddresses = {
  proxy: Address;
  implementation: Address;
};

export type ImplementationAddress = {
  implementation: Address;
};

export type DeployedContractAddresses = {
  VaulticAssetRegistry: ProxyContractAddresses;
  VaulticInvestmentManager: ProxyContractAddresses;
  VaulticFractionalOwnershipToken: ImplementationAddress;
};

export const FUJI_USDC_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65" as const;

export const deployedContractAddresses: Partial<Record<number, DeployedContractAddresses>> = {
  [chains.avalancheFuji.id]: {
    VaulticAssetRegistry: {
      proxy: "0x7bE0137284bE5E40Af3e6b5c178C1492F62bF635",
      implementation: "0x71c116D7bd6965A6912892978B42Fa1c658af9e6",
    },
    VaulticInvestmentManager: {
      proxy: "0xcA3EDAfd3344f57e7180ABD051e1bF027498e503",
      implementation: "0x2c6E61EfB9EdbCF2F5fFdAC52F65F8Dec0bD98dd",
    },
    VaulticFractionalOwnershipToken: {
      implementation: "0x4d8f5709AcD40aC1DB92A32F68DB81a1d5B1C3B9",
    },
  },
};

export type BaseConfig = {
  targetNetworks: readonly chains.Chain[];
  pollingInterval: number;
  alchemyApiKey: string;
  rpcOverrides?: Record<number, string>;
  walletConnectProjectId: string;
  burnerWalletMode: "localNetworksOnly" | "allNetworks" | "disabled";
};

export type ScaffoldConfig = BaseConfig;

export const DEFAULT_ALCHEMY_API_KEY = "cR4WnXePioePZ5fFrnSiR";

const scaffoldConfig = {
  targetNetworks: [chains.avalanche, chains.avalancheFuji, chains.hardhat],
  pollingInterval: 3000,
  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || DEFAULT_ALCHEMY_API_KEY,
  rpcOverrides: {
    [chains.avalanche.id]: process.env.NEXT_PUBLIC_AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
    [chains.avalancheFuji.id]:
      process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
  },
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "3a8170812b534d0ff9d794f19a901d64",
  burnerWalletMode: "localNetworksOnly",
} as const satisfies ScaffoldConfig;

export default scaffoldConfig;
