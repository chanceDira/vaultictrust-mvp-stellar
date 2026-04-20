/**
 * Vaultic Trust – Stellar Network Configuration
 *
 * Phase 2: Soroban contract IDs added after testnet deployment.
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
// Testnet USDC (Circle / SDF official testnet issuer)
// See: https://developers.stellar.org/docs/tokens/usdc
// ---------------------------------------------------------------------------
export const TESTNET_USDC_CONTRACT = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
export const TESTNET_USDC_ASSET = {
  code: "USDC",
  issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
};

// ---------------------------------------------------------------------------
// Deployed Soroban Contract IDs
// Run packages/soroban-contracts/deploy-testnet.sh to populate after deployment.
// ---------------------------------------------------------------------------

export type DeployedSorobanContracts = {
  VaulticAssetRegistry: string | null;
  VaulticUserRegistry: string | null;
  VaulticInvestmentManager: string | null;
  VaulticDividendManager: string | null;
};

// ---------------------------------------------------------------------------
// Administrative Controls
// ---------------------------------------------------------------------------
export const ADMIN_ADDRESSES = [
  "GCBWGQS24DUWG3HNCIFVICSJQXUTNGRKY7OZ4IZGBJSLK3MYHBY7HWHI",
  "GBWAF6C56BDHNNUDY2KLC5HFZPGXBZAFE7YKZC36GZYMI2B5QH2M3NCL", // Secondary admin for testing
];

export const deployedSorobanContracts: Partial<Record<StellarNetworkId, DeployedSorobanContracts>> = {
  testnet: {
    VaulticAssetRegistry: "CD6R5C34IE7FH6J7QRJMPDK73CLEQWCNTTFEC4MMPTDCGNT5QVU2G2GM",
    VaulticUserRegistry: "CBMJPKWG5L7PLNBYEUAC5GI77VXBP77BNE4YDXCRYIAXA22SNCIM3ELS",
    VaulticInvestmentManager: "CBFTVCXEVFNIQLTEAHJEZ4JTVPYWXMANGJGCIY2KOBXPHNEDKU6L6MK6",
    VaulticDividendManager: "CBK2O3A2QITOW7T3H45ROXLVYM6XB4GRKDX2D65SHGRM2L4Z5DHFDJRX",
  },
  mainnet: {
    VaulticAssetRegistry: null, // Not yet deployed
    VaulticUserRegistry: null, // Not yet deployed
    VaulticInvestmentManager: null, // Not yet deployed
    VaulticDividendManager: null, // Not yet deployed
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

const targetNetworkId: StellarNetworkId = (process.env.NEXT_PUBLIC_STELLAR_NETWORK as StellarNetworkId) ?? "testnet";

const network = STELLAR_NETWORKS[targetNetworkId];

const vaulticConfig: VaulticConfig = {
  targetNetwork: targetNetworkId,
  pollingInterval: 5000,
  horizonUrl: process.env.NEXT_PUBLIC_HORIZON_URL ?? network.horizonUrl,
  sorobanRpcUrl: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? network.sorobanRpcUrl,
  networkPassphrase: network.networkPassphrase,
};

export default vaulticConfig;
