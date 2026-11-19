"use client";

import type { ReactElement } from "react";
import { BoltIcon } from "@heroicons/react/24/outline";
import { EmptySpotlight } from "~~/components/home/EmptySpotlight";
import { HeroFeeNote } from "~~/components/home/HeroFeeNote";
import { SpotlightCard } from "~~/components/home/SpotlightCard";
import { useMarketplaceAssets } from "~~/hooks/vaultic/useAssets";
import type { OnChainAsset } from "~~/types/stellar";

function spotlightAsset(assets: OnChainAsset[]): OnChainAsset | null {
  return assets.find(asset => asset.state.tag === "Tokenized") ?? assets[0] ?? null;
}

export function HeroSpotlight(): ReactElement {
  const { assets, isLoading } = useMarketplaceAssets();
  const asset = spotlightAsset(assets);

  let body: ReactElement;
  if (isLoading) {
    body = <div className="h-96 animate-pulse rounded-3xl bg-base-200" aria-label="Loading a listing" />;
  } else if (!asset) {
    body = <EmptySpotlight />;
  } else {
    body = (
      <>
        <SpotlightCard asset={asset} />
        <HeroFeeNote />
        <div className="landing-float-late absolute -right-3 -top-5 hidden items-center gap-2 rounded-full border border-base-300 bg-base-100 px-4 py-2 shadow-lg sm:flex">
          <BoltIcon className="h-4 w-4 text-primary" aria-hidden />
          <span className="text-xs font-bold text-base-content">Settles in seconds on Stellar</span>
        </div>
      </>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div
        className="absolute inset-0 translate-x-4 translate-y-4 rounded-3xl border border-primary/20 bg-primary/5"
        aria-hidden
      />
      <div className="relative">{body}</div>
    </div>
  );
}
