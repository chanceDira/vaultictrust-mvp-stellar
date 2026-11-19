"use client";

import type { ReactElement } from "react";
import { EmptySpotlight } from "~~/components/home/EmptySpotlight";
import { SpotlightCard } from "~~/components/home/SpotlightCard";
import { useMarketplaceAssets } from "~~/hooks/vaultic/useAssets";
import type { OnChainAsset } from "~~/types/stellar";

function spotlightAsset(assets: OnChainAsset[]): OnChainAsset | null {
  return assets.find(asset => asset.state.tag === "Tokenized") ?? assets[0] ?? null;
}

export function HeroSpotlight(): ReactElement {
  const { assets, isLoading } = useMarketplaceAssets();
  const asset = spotlightAsset(assets);

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-base-200" aria-label="Loading a listing" />;
  }
  if (!asset) return <EmptySpotlight />;
  return <SpotlightCard asset={asset} />;
}
