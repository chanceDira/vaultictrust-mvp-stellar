import type { ReactElement } from "react";
import Link from "next/link";
import type { OnChainAsset } from "~~/types/stellar";
import { shareOffer } from "~~/utils/vaultic/shareOffer";
import { shareSplit } from "~~/utils/vaultic/shareSplit";

type ListingMarqueeCardProps = {
  asset: OnChainAsset;
  decorative?: boolean;
};

export function ListingMarqueeCard({ asset, decorative = false }: ListingMarqueeCardProps): ReactElement {
  const offer = shareOffer(asset);
  const split = asset.model.tag === "Fractional" ? shareSplit(asset.total_shares, asset.sold_shares) : null;

  return (
    <Link
      href={`/asset/${asset.asset_id}`}
      tabIndex={decorative ? -1 : undefined}
      aria-hidden={decorative || undefined}
      className="flex w-72 shrink-0 flex-col justify-between border-r border-base-300/80 px-5 py-4 transition-colors hover:bg-primary/5 sm:w-80"
    >
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-primary">{asset.asset_code}</span>
          <span className="truncate text-xs font-semibold text-base-content/50">{asset.asset_category}</span>
        </div>
        <p className="mt-2 line-clamp-2 min-h-11 text-base font-bold leading-snug text-base-content">
          {asset.asset_name}
        </p>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-base-content/55">Share price</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-base-content">{offer.priceLabel}</p>
        </div>
        {offer.forSale ? (
          <p className="text-sm font-bold tabular-nums text-primary">{offer.soldPercent}% sold</p>
        ) : (
          <p className="text-sm font-semibold text-base-content/50">Approved</p>
        )}
      </div>
      {split && offer.forSale ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/20" aria-hidden>
          <div className="h-full bg-primary" style={{ width: `${split.soldTenths / 10}%` }} />
        </div>
      ) : null}
    </Link>
  );
}
