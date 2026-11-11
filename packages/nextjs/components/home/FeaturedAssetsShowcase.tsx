"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { VaulticLoader } from "~~/components/VaulticLoader";
import { ListingMarqueeCard } from "~~/components/home/ListingMarqueeCard";
import { MarqueeTrack } from "~~/components/home/MarqueeTrack";
import { useMarketplaceAssets } from "~~/hooks/vaultic/useAssets";
import type { OnChainAsset } from "~~/types/stellar";
import { marqueeRows } from "~~/utils/vaultic/marqueeRows";

const CARD_SECONDS_PER_ROW = 2.4;
const MIN_CARD_SECONDS = 40;

function assetKey(asset: OnChainAsset): string {
  return String(asset.asset_id);
}

export function FeaturedAssetsShowcase(): ReactElement {
  const { assets, isLoading } = useMarketplaceAssets();
  const rows = marqueeRows(assets, assetKey);
  const durationSec = Math.max(MIN_CARD_SECONDS, Math.round(rows.length * CARD_SECONDS_PER_ROW));

  return (
    <section className="border-y border-base-300/80 bg-base-100">
      <div className="mx-auto flex w-full max-w-7xl items-end justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
        <div>
          <p className="text-sm font-bold text-primary">On the marketplace now</p>
          <p className="mt-0.5 text-sm font-medium text-base-content/70">Listings VTrust Africa has reviewed</p>
        </div>
        <Link
          href="/marketplace"
          className="btn btn-ghost btn-sm shrink-0 gap-1.5 rounded-xl px-3 text-primary hover:bg-primary/10"
        >
          All listings
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
      {isLoading ? <VaulticLoader message="Loading listings" className="py-8" /> : null}
      {!isLoading && assets.length === 0 ? (
        <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
          <p className="text-base font-semibold text-base-content/70">No listings are open right now.</p>
          <Link href="/marketplace" className="btn btn-primary btn-sm mt-4 gap-2 rounded-xl px-6">
            Browse marketplace
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
      {!isLoading && assets.length > 0 ? (
        <MarqueeTrack durationSec={durationSec}>
          {rows.map(row => (
            <ListingMarqueeCard key={row.key} asset={row.item} decorative={row.copy > 0} />
          ))}
        </MarqueeTrack>
      ) : null}
    </section>
  );
}
