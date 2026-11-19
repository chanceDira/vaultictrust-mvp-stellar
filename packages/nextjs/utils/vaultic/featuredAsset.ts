import type { OnChainAsset } from "~~/types/stellar";

export function featuredAsset(assets: OnChainAsset[]): OnChainAsset | null {
  return assets.find(asset => asset.state.tag === "Tokenized") ?? assets[0] ?? null;
}
