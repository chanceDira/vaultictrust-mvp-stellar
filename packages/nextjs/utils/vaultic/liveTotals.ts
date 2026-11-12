import type { OnChainAsset } from "~~/types/stellar";

const OPEN_LISTING_STATES = new Set(["Active", "Tokenized"]);

export type LiveTotals = {
  openListings: number;
  sharesSold: bigint;
  usdcRaised: bigint;
};

export function formatCount(value: bigint): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function summarizeOpenListings(assets: readonly OnChainAsset[]): LiveTotals | null {
  let openListings = 0;
  let sharesSold = 0n;
  let usdcRaised = 0n;

  for (const asset of assets) {
    if (!OPEN_LISTING_STATES.has(asset.state.tag)) continue;
    openListings += 1;
    if (asset.state.tag !== "Tokenized") continue;
    if (asset.sold_shares < 0n || asset.price_per_share < 0n) return null;
    sharesSold += asset.sold_shares;
    usdcRaised += asset.sold_shares * asset.price_per_share;
  }

  return { openListings, sharesSold, usdcRaised };
}
