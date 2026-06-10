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

export const ADMIN_ADDRESSES = [
  "GCBWGQS24DUWG3HNCIFVICSJQXUTNGRKY7OZ4IZGBJSLK3MYHBY7HWHI",
  "GBWAF6C56BDHNNUDY2KLC5HFZPGXBZAFE7YKZC36GZYMI2B5QH2M3NCL",
  "GD74RCHSIVH7TJYCBP3ZQKALGL7VUSF3SWXBVLCLLKWGRMFPSMDT56AK",
];

export const deployedSorobanContracts: Partial<Record<StellarNetworkId, DeployedSorobanContracts>> = {
  testnet: {
    VaulticAssetRegistry: "CAUISC56SF5EFPLV33KRXWWU63JU7UATLKTMQVEEVONJPGTSZMITESWB",
    VaulticUserRegistry: "CCFXQOUZSAE7O5NLKJEA4I7I76YDDDKHF3V7EOAZYCMK2X7CIVQ6XSWR",
    VaulticInvestmentManager: "CAWR3VTTADC6Y3CE2N3DORX7NRSTXPFRHQ35SXO5VKGDX43TGTASGPCG",
    VaulticDividendManager: "CBXBIPIRTZFZTO7YLX36JCH72TTND4IUQF7HBMWI4W2K36F5HMZLNJFF",
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
