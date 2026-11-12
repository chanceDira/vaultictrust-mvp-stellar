import {
  STELLAR_NETWORKS,
  type StellarNetworkId,
  TESTNET_USDC_ASSET,
  TESTNET_USDC_CONTRACT,
  deployedSorobanContracts,
  getExplorerAssetUrl,
  getExplorerContractUrl,
} from "~~/scaffold.config";

export type PublishedAddress = {
  id: string;
  label: string;
  detail: string;
  address: string | null;
  explorerUrl: string | null;
};

type ContractKey =
  | "VaulticAssetRegistry"
  | "VaulticUserRegistry"
  | "VaulticInvestmentManager"
  | "VaulticDividendManager";

const CONTRACT_ROWS: { id: string; label: string; detail: string; key: ContractKey }[] = [
  {
    id: "registry",
    label: "Asset registry",
    detail: "Listings are registered here.",
    key: "VaulticAssetRegistry",
  },
  {
    id: "userRegistry",
    label: "Identity registry",
    detail: "Verification status is stored here.",
    key: "VaulticUserRegistry",
  },
  {
    id: "investmentManager",
    label: "Investment manager",
    detail: "Share purchases and whole-asset purchases settle here.",
    key: "VaulticInvestmentManager",
  },
  {
    id: "dividendManager",
    label: "Dividend manager",
    detail: "Yield deposits and claims settle here.",
    key: "VaulticDividendManager",
  },
];

export function publishedNetworkName(networkId: StellarNetworkId): string {
  return STELLAR_NETWORKS[networkId].name;
}

export function publishedAddresses(networkId: StellarNetworkId): PublishedAddress[] {
  const deployed = deployedSorobanContracts[networkId];
  const rows: PublishedAddress[] = CONTRACT_ROWS.map(row => {
    const address = deployed?.[row.key] ?? null;
    return {
      id: row.id,
      label: row.label,
      detail: row.detail,
      address,
      explorerUrl: address ? getExplorerContractUrl(address, networkId) : null,
    };
  });

  if (networkId !== "testnet") return rows;

  rows.push({
    id: "usdcContract",
    label: "USDC contract",
    detail: "Share purchases approve this contract before they pay.",
    address: TESTNET_USDC_CONTRACT,
    explorerUrl: getExplorerContractUrl(TESTNET_USDC_CONTRACT, networkId),
  });
  rows.push({
    id: "usdcIssuer",
    label: "USDC issuer",
    detail: "A wallet trusts this issuer before it can hold USDC.",
    address: TESTNET_USDC_ASSET.issuer,
    explorerUrl: getExplorerAssetUrl(TESTNET_USDC_ASSET.code, TESTNET_USDC_ASSET.issuer, networkId),
  });

  return rows;
}
