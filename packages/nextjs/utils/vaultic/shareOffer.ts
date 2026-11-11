import type { OnChainAsset } from "~~/types/stellar";

const STROOPS_PER_UNIT = 10_000_000;
const FULL_PERCENT = 100;

export type ShareOffer = {
  priceLabel: string;
  soldPercent: number;
  forSale: boolean;
};

export function shareOffer(asset: OnChainAsset): ShareOffer {
  const totalShares = Number(asset.total_shares);
  const soldShares = Number(asset.sold_shares);
  const forSale = asset.state.tag === "Tokenized" && totalShares > 0;
  const soldPercent =
    totalShares > 0 ? Math.min(FULL_PERCENT, Math.round((soldShares / totalShares) * FULL_PERCENT)) : 0;
  const price = Number(asset.price_per_share) / STROOPS_PER_UNIT;
  const priceLabel = forSale ? `$${price.toFixed(2)}` : "Not issued";
  return { priceLabel, soldPercent, forSale };
}
