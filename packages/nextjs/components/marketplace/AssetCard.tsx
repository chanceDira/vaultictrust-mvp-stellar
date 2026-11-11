"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { ListingPlate } from "~~/components/marketplace/ListingPlate";
import { CopyAddress } from "~~/components/ui/CopyAddress";
import { useAssetMetadata } from "~~/hooks/vaultic/useAssetMetadata";
import { listingStatusLabel } from "~~/utils/vaultic/listingLabels";
import { OnChainAsset } from "~~/types/stellar";

type AssetCardProps = {
  asset: OnChainAsset;
};

const FULL_PERCENT = 100;

export function AssetCard({ asset }: AssetCardProps): ReactElement {
  const { metadata } = useAssetMetadata(asset.metadata_uri);
  const sharePrice = (Number(asset.price_per_share) / 1e7).toFixed(2);
  const totalShares = Number(asset.total_shares);
  const soldShares = Number(asset.sold_shares);
  const available = totalShares - soldShares;
  const soldPercent =
    totalShares > 0 ? Math.min(FULL_PERCENT, Math.round((soldShares / totalShares) * FULL_PERCENT)) : 0;
  const sharesForSale = asset.state.tag === "Tokenized";
  const place = metadata?.location && metadata.location !== asset.asset_category ? metadata.location : "";

  return (
    <article
      data-testid="asset-card"
      className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm transition-colors hover:border-primary/40"
    >
      <Link
        href={`/asset/${asset.asset_id}`}
        aria-label={`Open ${asset.asset_name}`}
        className="absolute inset-0 z-0"
      />
      <div className="pointer-events-none relative z-10 flex flex-1 flex-col text-center md:text-left">
        <ListingPlate
          code={asset.asset_code}
          category={asset.asset_category}
          imageUrl={metadata?.imageUrl ?? null}
          status={listingStatusLabel(asset.state.tag)}
          forSale={sharesForSale}
        />
        <div className="flex flex-1 flex-col px-4 pb-3 pt-3">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-base-content">{asset.asset_name}</h3>
          {place ? <p className="mt-1 text-xs font-medium text-base-content/55">{place}</p> : null}
          <div className="mt-4 border-t border-base-300/80 pt-3">
            {sharesForSale ? (
              <div className="mb-3">
                <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-base-content/55">
                  <span>{soldPercent}% sold</span>
                  <span className="tabular-nums">{available.toLocaleString()} left</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-base-200">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${soldPercent}%` }} />
                </div>
              </div>
            ) : null}
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-base-content/55">Share price</p>
                <p className="mt-0.5 text-base font-bold tabular-nums text-base-content">
                  {sharesForSale ? sharePrice : "Not issued"}
                </p>
              </div>
              <p className="text-xs font-semibold text-base-content/45">{sharesForSale ? "USDC" : "Soon"}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="relative z-10 border-t border-base-300/80 px-4 py-3">
        <CopyAddress label="Owner" address={asset.asset_owner} />
      </div>
    </article>
  );
}
