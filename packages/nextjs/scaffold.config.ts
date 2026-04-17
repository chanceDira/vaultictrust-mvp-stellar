/**
 * Vaultic Trust – Stellar Network Configuration
 *
 * This config replaces the former Avalanche/EVM scaffold config.
 * Phase 2 will add deployed Soroban contract IDs.
 */

// ---------------------------------------------------------------------------
// Stellar Network Constants
// ---------------------------------------------------------------------------

export const STELLAR_NETWORKS = {
  mainnet: {
    name: "Stellar Mainnet",
    networkPassphrase: "Public Global Stellar Network ; September 2015",
    horizonUrl: "https://horizon.stellar.org",
    sorobanRpcUrl: "https://soroban-rpc.stellar.org",
  },
  testnet: {
    name: "Stellar Testnet",
    networkPassphrase: "Test SDF Network ; September 2015",
    horizonUrl: "https://horizon-testnet.stellar.org",
    sorobanRpcUrl: "https://soroban-testnet.stellar.org",
  },
} as const;

export type StellarNetworkId = keyof typeof STELLAR_NETWORKS;

// ---------------------------------------------------------------------------
// Deployed Soroban Contract IDs
// These will be populated in Phase 2 after Soroban contracts are deployed.
// ---------------------------------------------------------------------------

export type DeployedSorobanContracts = {
  VaulticAssetRegistry: string | null;
  VaulticInvestmentManager: string | null;
  VaulticFractionalOwnershipToken: string | null;
};

export const deployedSorobanContracts: Partial<Record<StellarNetworkId, DeployedSorobanContracts>> = {
  testnet: {
    VaulticAssetRegistry: null, // TODO: deploy Soroban contract
    VaulticInvestmentManager: null, // TODO: deploy Soroban contract
    VaulticFractionalOwnershipToken: null, // TODO: deploy Soroban contract
  },
  mainnet: {
    VaulticAssetRegistry: null, // TODO: deploy Soroban contract
    VaulticInvestmentManager: null, // TODO: deploy Soroban contract
    VaulticFractionalOwnershipToken: null, // TODO: deploy Soroban contract
  },
};

// ---------------------------------------------------------------------------
// App Config
// ---------------------------------------------------------------------------

export type VaulticConfig = {
  targetNetwork: StellarNetworkId;
  pollingInterval: number;
  horizonUrl: string;
  sorobanRpcUrl: string;
  networkPassphrase: string;
};

const targetNetworkId: StellarNetworkId =
  (process.env.NEXT_PUBLIC_STELLAR_NETWORK as StellarNetworkId) ?? "testnet";

const network = STELLAR_NETWORKS[targetNetworkId];

const vaulticConfig: VaulticConfig = {
  targetNetwork: targetNetworkId,
  pollingInterval: 5000,
  horizonUrl: process.env.NEXT_PUBLIC_HORIZON_URL ?? network.horizonUrl,
  sorobanRpcUrl: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? network.sorobanRpcUrl,
  networkPassphrase: network.networkPassphrase,
};

export default vaulticConfig;
