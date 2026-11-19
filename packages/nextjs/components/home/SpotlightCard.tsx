"use client";

import type { ReactElement } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { FeaturedBadge } from "~~/components/home/FeaturedBadge";
import { useAssetMetadata } from "~~/hooks/vaultic/useAssetMetadata";
import type { OnChainAsset } from "~~/types/stellar";
import { listingStatusLabel, saleTypeLabel } from "~~/utils/vaultic/listingLabels";
import { shareOffer } from "~~/utils/vaultic/shareOffer";

const STROOPS_PER_USDC = 10_000_000n;

type SpotlightCardProps = {
  asset: OnChainAsset;
};

export function SpotlightCard({ asset }: SpotlightCardProps): ReactElement {
  const { metadata } = useAssetMetadata(asset.metadata_uri);
  const offer = shareOffer(asset);
  const imageUrl = metadata?.imageUrl ?? null;
  const place = metadata?.location && metadata.location !== asset.asset_category ? metadata.location : "";

  return (
    <Link
      href={`/asset/${asset.asset_id}`}
      className="group block overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-2xl shadow-primary/10 transition-colors hover:border-primary/40"
    >
      <div className="relative h-56 overflow-hidden sm:h-64">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={asset.asset_name}
            fill
            unoptimized
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/35 via-primary/10 to-base-200" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <FeaturedBadge />
          <span className="rounded-lg bg-base-100/90 px-2.5 py-1 text-xs font-bold text-base-content">
            {asset.asset_category}
          </span>
          <span className="rounded-lg bg-base-100/90 px-2.5 py-1 text-xs font-bold text-base-content/70">
            {saleTypeLabel(asset.model.tag)}
          </span>
        </div>
        <div className="absolute inset-x-4 bottom-4 text-white">
          <p className="text-xs font-bold opacity-80">{asset.asset_code}</p>
          <p className="mt-1 line-clamp-2 text-xl font-bold leading-snug sm:text-2xl">{asset.asset_name}</p>
          {place ? (
            <p className="mt-1 flex items-center gap-1 text-sm font-semibold opacity-90">
              <MapPinIcon className="h-4 w-4 shrink-0" aria-hidden />
              {place}
            </p>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 p-5">
        <div>
          <p className="text-xs font-semibold text-base-content/55">Valuation</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-base-content">
            {(BigInt(asset.valuation) / STROOPS_PER_USDC).toLocaleString("en-US")} USDC
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-base-content/55">Share price</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-base-content">{offer.priceLabel}</p>
        </div>
        {offer.forSale ? (
          <div className="col-span-2">
            <div className="flex items-center justify-between text-xs font-semibold text-base-content/60">
              <span>{offer.soldPercent}% sold</span>
              <span>{listingStatusLabel(asset.state.tag)}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/15" aria-hidden>
              <div className="h-full rounded-full bg-primary" style={{ width: `${offer.soldPercent}%` }} />
            </div>
          </div>
        ) : null}
        <p className="col-span-2 flex items-center gap-1.5 text-sm font-bold text-primary">
          View this listing
          <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
        </p>
      </div>
    </Link>
  );
}
