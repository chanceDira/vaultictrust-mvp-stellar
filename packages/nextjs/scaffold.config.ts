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

export const TESTNET_USDC_CONTRACT = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
export const TESTNET_USDC_ASSET = {
  code: "USDC",
  issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
};

export type DeployedSorobanContracts = {
  VaulticAssetRegistry: string | null;
  VaulticUserRegistry: string | null;
  VaulticInvestmentManager: string | null;
  VaulticDividendManager: string | null;
};

export const deployedSorobanContracts: Partial<Record<StellarNetworkId, DeployedSorobanContracts>> = {
  testnet: {
    VaulticAssetRegistry: "CDHHMAJ4WECQYOLHAEWIYJNZ2OPPNY5L5OU6GM2ER6JJ6UYT6JFAADBW",
    VaulticUserRegistry: "CDLBST2RYQHFTLDLB6TA242K3WAHV6KQ6YB7K5UGBCBJN6IN34ZQLVCI",
    VaulticInvestmentManager: "CBKJ53DIHOWBMYBIIVM66NVWXSGI3SXJH224VQYR57YZJIL4RC4W7PRR",
    VaulticDividendManager: "CBDRQYD77GPIQFRGIPIGT64ZDY6C7PCYF72RU7BYSSOEZSG2A2A5XMD3",
  },
  mainnet: {
    VaulticAssetRegistry: null,
    VaulticUserRegistry: null,
    VaulticInvestmentManager: null,
    VaulticDividendManager: null,
  },
};

export const PROTOCOL_METADATA = {
  VAULTIC_ORG_PUBLIC_KEY: "GBFUEPUJ5JVBI7ZMFUE4MPVDACCWOOSOV4XSGMOO7Q6H7LAD7UPIXRA7",
  ENCRYPTION_SCHEME: "AES-GCM-256 / NaCl Box",
};

export type VaulticConfig = {
  targetNetwork: StellarNetworkId;
  pollingInterval: number;
  horizonUrl: string;
  sorobanRpcUrl: string;
  networkPassphrase: string;
};

const targetNetworkId: StellarNetworkId = (process.env.NEXT_PUBLIC_STELLAR_NETWORK as StellarNetworkId) ?? "testnet";

const network = STELLAR_NETWORKS[targetNetworkId];

const explorerNetworkSlug = (networkId: StellarNetworkId) => (networkId === "mainnet" ? "public" : "testnet");

export const getExplorerTxUrl = (hash: string, networkId: StellarNetworkId = targetNetworkId) =>
  `https://stellar.expert/explorer/${explorerNetworkSlug(networkId)}/tx/${hash}`;

export const getExplorerContractUrl = (contractId: string, networkId: StellarNetworkId = targetNetworkId) =>
  `https://stellar.expert/explorer/${explorerNetworkSlug(networkId)}/contract/${contractId}`;

export const getExplorerAccountUrl = (account: string, networkId: StellarNetworkId = targetNetworkId) =>
  `https://stellar.expert/explorer/${explorerNetworkSlug(networkId)}/account/${account}`;

export const getExplorerAssetUrl = (code: string, issuer: string, networkId: StellarNetworkId = targetNetworkId) =>
  `https://stellar.expert/explorer/${explorerNetworkSlug(networkId)}/asset/${code}-${issuer}`;

export const STELLAR_DISPLAY_NAME = "Stellar";

export const EARLY_ACCESS_FORM_URL = "https://forms.gle/QoMKbVJ4FoPxeXiQ6";

const vaulticConfig: VaulticConfig = {
  targetNetwork: targetNetworkId,
  pollingInterval: 5000,
  horizonUrl: process.env.NEXT_PUBLIC_HORIZON_URL ?? network.horizonUrl,
  sorobanRpcUrl: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? network.sorobanRpcUrl,
  networkPassphrase: network.networkPassphrase,
};

export default vaulticConfig;
