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

export type ChainWithAttributes = any;
export type AllowedChainIds = any;
export const NETWORKS_EXTRA_DATA: any = {};
