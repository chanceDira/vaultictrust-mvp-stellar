"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { MarqueeTrack } from "~~/components/home/MarqueeTrack";
import { useMarketplaceAssets } from "~~/hooks/vaultic/useAssets";
import type { OnChainAsset } from "~~/types/stellar";
import { marqueeRows } from "~~/utils/vaultic/marqueeRows";
import { shareOffer } from "~~/utils/vaultic/shareOffer";

const TICKER_SECONDS_PER_ROW = 1.6;
const MIN_TICKER_SECONDS = 28;

function assetKey(asset: OnChainAsset): string {
  return String(asset.asset_id);
}

function TickerItem({ asset, decorative = false }: { asset: OnChainAsset; decorative?: boolean }): ReactElement {
  const offer = shareOffer(asset);

  return (
    <Link
      href={`/asset/${asset.asset_id}`}
      tabIndex={decorative ? -1 : undefined}
      aria-hidden={decorative || undefined}
      className="inline-flex h-9 shrink-0 items-center gap-2.5 border-r border-base-300/70 px-4 text-xs font-semibold hover:bg-primary/5"
    >
      <span className="text-base-content">{asset.asset_code}</span>
      <span className="tabular-nums text-base-content/70">{offer.priceLabel}</span>
      {offer.forSale ? (
        <span className="tabular-nums text-primary">{offer.soldPercent}% sold</span>
      ) : (
        <span className="text-base-content/45">Approved</span>
      )}
    </Link>
  );
}

export function AssetTicker(): ReactElement | null {
  const { assets, isLoading } = useMarketplaceAssets();
  if (isLoading || assets.length === 0) return null;

  const rows = marqueeRows(assets, assetKey);
  const durationSec = Math.max(MIN_TICKER_SECONDS, Math.round(rows.length * TICKER_SECONDS_PER_ROW));

  return (
    <>
      <div className="h-9 shrink-0" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-base-300 bg-base-100/95 backdrop-blur-md">
        <MarqueeTrack durationSec={durationSec}>
          {rows.map(row => (
            <TickerItem key={row.key} asset={row.item} decorative={row.copy > 0} />
          ))}
        </MarqueeTrack>
      </div>
    </>
  );
}
