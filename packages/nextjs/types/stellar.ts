export type AssetStateKey = "Pending" | "Active" | "Tokenized" | "Closed" | "Relisted";
export type OwnershipModelKey = "WholeOwnership" | "Fractional";
export type UserTab = "assets" | "compliance" | "governance";

export interface OnChainAsset {
  asset_id: number;
  asset_name: string;
  asset_category: string;
  asset_code: string;
  asset_owner: string;
  state: { tag: AssetStateKey };
  model: { tag: OwnershipModelKey };
  valuation: bigint;
  total_shares: bigint;
  price_per_share: bigint;
  sold_shares: bigint;
  metadata_uri: string;
  registered_at: bigint;
  issuer: string | null;
}
