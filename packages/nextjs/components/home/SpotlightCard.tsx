"use client";

import type { ReactElement } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAssetMetadata } from "~~/hooks/vaultic/useAssetMetadata";
import type { OnChainAsset } from "~~/types/stellar";
import { saleTypeLabel } from "~~/utils/vaultic/listingLabels";
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
      className="group block overflow-hidden rounded-2xl border border-base-300 bg-base-100 transition-colors hover:border-base-content/30"
    >
      <div className="relative aspect-video bg-base-200 lg:aspect-[4/3]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={asset.asset_name}
            fill
            unoptimized
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="p-5">
        <p className="text-xs font-semibold text-base-content/55">
          {asset.asset_category} · {saleTypeLabel(asset.model.tag)}
          {place ? ` · ${place}` : ""}
        </p>
        <p className="mt-1 text-lg font-bold leading-snug text-base-content">{asset.asset_name}</p>
        <dl className="mt-4 grid grid-cols-3 gap-4 border-t border-base-300 pt-4 text-sm">
          <div>
            <dt className="font-medium text-base-content/55">Valuation</dt>
            <dd className="mt-0.5 font-bold tabular-nums text-base-content">
              {(BigInt(asset.valuation) / STROOPS_PER_USDC).toLocaleString("en-US")} USDC
            </dd>
          </div>
          <div>
            <dt className="font-medium text-base-content/55">Share price</dt>
            <dd className="mt-0.5 font-bold tabular-nums text-base-content">{offer.priceLabel}</dd>
          </div>
          {offer.forSale ? (
            <div>
              <dt className="font-medium text-base-content/55">Sold</dt>
              <dd className="mt-0.5 font-bold tabular-nums text-base-content">{offer.soldPercent}%</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </Link>
  );
}
