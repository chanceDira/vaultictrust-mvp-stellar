"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { useAssetMetadata } from "~~/hooks/vaultic/useAssetMetadata";
import { shortenStellarAddress } from "~~/services/stellar/horizonClient";
import { OnChainAsset } from "~~/types/stellar";

type AssetCardProps = {
  asset: OnChainAsset;
};

export function AssetCard({ asset }: AssetCardProps): ReactElement {
  const { metadata } = useAssetMetadata(asset.metadata_uri);
  const sharePrice = (Number(asset.price_per_share) / 1e7).toFixed(2);
  const available = Number(asset.total_shares - asset.sold_shares);
  const sharesForSale = asset.state.tag === "Tokenized";
  const place = metadata?.location || asset.asset_category;

  return (
    <Link
      data-testid="asset-card"
      href={`/asset/${asset.asset_id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 text-center transition-colors hover:border-primary/50 md:text-left"
    >
      {metadata?.imageUrl ? (
        <img src={metadata.imageUrl} alt="" className="h-44 w-full object-cover sm:h-52" />
      ) : null}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-sm font-semibold text-primary">{place}</p>
        <h3 className="mt-1 text-xl font-bold leading-tight text-base-content">{asset.asset_name}</h3>
        <p className="mt-1 text-xs font-semibold text-base-content/60">
          {asset.asset_code} · Owner {shortenStellarAddress(asset.asset_owner, 4)}
        </p>
        {metadata?.description ? (
          <p className="mt-3 line-clamp-3 text-sm font-medium leading-relaxed text-base-content/75">
            {metadata.description}
          </p>
        ) : null}
        <div className="mt-auto grid grid-cols-2 gap-3 pt-5">
          <div>
            <p className="text-sm font-semibold text-base-content/70">Share price</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-base-content">
              {sharesForSale ? `${sharePrice} USDC` : "Not issued"}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-base-content/70">Available</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-base-content">
              {sharesForSale ? available.toLocaleString() : "Soon"}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
