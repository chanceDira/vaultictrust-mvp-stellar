/**
 * Vaultic Network Utilities (Stellar Migration)
 */

export type StellarNetwork = {
  id: string;
  name: string;
  horizonUrl: string;
};

export const STELLAR_NETWORKS: Record<string, StellarNetwork> = {
  testnet: {
    id: "testnet",
    name: "Stellar Testnet",
    horizonUrl: "https://horizon-testnet.stellar.org",
  },
  public: {
    id: "public",
    name: "Stellar Public",
    horizonUrl: "https://horizon.stellar.org",
  },
};

/**
 * DEPRECATED EVM TYPES — stubs kept for internal dependency resolution during phase 1 cleanup.
 */
export type ChainWithAttributes = any;
export type AllowedChainIds = any;
export const NETWORKS_EXTRA_DATA: any = {};
