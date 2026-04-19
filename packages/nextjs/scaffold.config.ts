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

export const deployedSorobanContracts: Partial<Record<StellarNetworkId, DeployedSorobanContracts>> = {
  testnet: {
    VaulticAssetRegistry: "CDGNWRTPYNRIPE5T7OXDDTR75UBTDGRJL4WFA77N5YHIXFUHVTJLDUQB",
    VaulticUserRegistry: "CA55GXQHWV25WIK2672ORMAUNO6RKKRWMBDQDRBCVVJSHDS5PPJDYCY2",
    VaulticInvestmentManager: "CAUVFRAURDHU3RAUFIEZBTMFW2ZFNS5YWR4O3NF67PHF37J5IQ6OGCUO",
    VaulticDividendManager: "CATOYWJPPFGPXZ5RS3ELPJLGUXW4JEDWPSWTTYAKHQDF6RN2BEWEF2OC",
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
