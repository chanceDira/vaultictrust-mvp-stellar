import type { ReactElement } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { AssetBuyPanel } from "~~/components/asset/AssetBuyPanel";
import { shortenStellarAddress } from "~~/services/stellar/horizonClient";
import { OnChainAsset } from "~~/types/stellar";

type AssetListingViewProps = {
  asset: OnChainAsset;
  description: string;
  imageUrl: string | null;
  location: string;
  listedOn: string;
  yieldRoundCount: number;
  buyingWhole: boolean;
  onBuy: () => void;
};

export function AssetListingView({
  asset,
  description,
  imageUrl,
  location,
  listedOn,
  yieldRoundCount,
  buyingWhole,
  onBuy,
}: AssetListingViewProps): ReactElement {
  const soldPercentage = asset.total_shares > 0n ? Number((asset.sold_shares * 100n) / asset.total_shares) : 0;
  const valuationUsdc = Number(asset.valuation) / 1e7;
  const pricePerShare = Number(asset.price_per_share) / 1e7;
  const availableShares = Number(asset.total_shares - asset.sold_shares);
  const place = location || asset.asset_category;

  return (
    <div className="flex grow flex-col pb-16">
      <section className="border-b border-base-300 bg-base-200/50">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <Link href="/marketplace" className="btn btn-ghost btn-sm mb-6 gap-2 rounded-xl font-semibold">
            <ArrowLeftIcon className="h-3 w-3" />
            Back to Marketplace
          </Link>
          {imageUrl ? (
            <img src={imageUrl} alt={asset.asset_name} className="mb-6 aspect-[16/9] w-full rounded-2xl object-cover" />
          ) : null}
          <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-end md:justify-between md:text-left">
            <div className="mx-auto w-full max-w-2xl md:mx-0">
              <p className="text-sm font-semibold text-primary">{place}</p>
              <h1 className="page-title mt-1 text-3xl leading-tight sm:text-4xl">{asset.asset_name}</h1>
              <p className="mt-2 text-sm font-semibold text-base-content/70">
                {asset.asset_code} · {asset.asset_category}
              </p>
              <p className="mt-3 text-sm font-medium leading-relaxed text-base-content/75">
                VTrust Africa reviewed this listing before shares went on sale.
              </p>
            </div>
            <div className="w-full rounded-2xl border border-base-300 bg-base-100 p-5 md:w-auto md:min-w-[240px]">
              <p className="mb-1 text-sm font-semibold text-base-content/70">Asset value</p>
              <div className="flex items-baseline justify-center gap-2 md:justify-start">
                <span className="text-3xl font-extrabold text-base-content">${valuationUsdc.toLocaleString()}</span>
                <span className="text-sm font-semibold text-base-content/70">USDC</span>
              </div>
              <div className="my-4 h-px bg-base-300" />
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-base-content/70">Share price</span>
                <span className="font-mono">${pricePerShare.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-base-300 bg-base-100 p-5 text-center md:text-left">
              <h2 className="text-lg font-bold text-base-content">About this listing</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-base-content/80">{description}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-base-300 bg-base-100 p-4 text-center md:text-left">
                <p className="text-sm font-semibold text-base-content/70">Shares sold</p>
                <p className="mt-1 text-2xl font-extrabold text-base-content">{soldPercentage}%</p>
                <p className="mt-1 text-sm font-medium text-base-content/70">
                  {Number(asset.sold_shares).toLocaleString()} of {Number(asset.total_shares).toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl border border-base-300 bg-base-100 p-4 text-center md:text-left">
                <p className="text-sm font-semibold text-base-content/70">Yield payments</p>
                <p className="mt-1 text-2xl font-extrabold text-base-content">{yieldRoundCount}</p>
                <p className="mt-1 text-sm font-medium text-base-content/70">
                  {yieldRoundCount === 1 ? "Round paid so far" : "Rounds paid so far"}
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-4 rounded-2xl border border-base-300 bg-base-100 p-5 text-center sm:grid-cols-2 md:text-left">
              {listedOn ? (
                <div>
                  <dt className="text-sm font-semibold text-base-content/70">Listed</dt>
                  <dd className="mt-1 text-sm font-bold">{listedOn}</dd>
                </div>
              ) : null}
              {location ? (
                <div>
                  <dt className="text-sm font-semibold text-base-content/70">Place</dt>
                  <dd className="mt-1 text-sm font-bold">{location}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-sm font-semibold text-base-content/70">Owner</dt>
                <dd className="mt-1 font-mono text-sm font-bold" title={asset.asset_owner}>
                  {shortenStellarAddress(asset.asset_owner, 6)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-base-content/70">Sale type</dt>
                <dd className="mt-1 text-sm font-bold">{asset.model.tag === "Fractional" ? "Shares" : "Whole asset"}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-base-content/70">Share code</dt>
                <dd className="mt-1 font-mono text-sm font-bold">{asset.asset_code}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-base-content/70">Listing number</dt>
                <dd className="mt-1 font-mono text-sm font-bold">#{asset.asset_id}</dd>
              </div>
            </dl>
          </div>
          <AssetBuyPanel
            assetCode={asset.asset_code}
            totalShares={Number(asset.total_shares)}
            availableShares={availableShares}
            busy={buyingWhole}
            onBuy={onBuy}
          />
        </div>
      </section>
    </div>
  );
}
