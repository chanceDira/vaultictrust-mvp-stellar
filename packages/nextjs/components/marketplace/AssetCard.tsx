"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  CubeIcon,
  GlobeAltIcon,
  ShoppingBagIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { shortenStellarAddress } from "~~/services/stellar/horizonClient";
import { OnChainAsset } from "~~/types/stellar";

const CATEGORY_ICONS: Record<string, any> = {
  "Real Estate": BuildingOffice2Icon,
  Mining: SparklesIcon,
  Agriculture: GlobeAltIcon,
  Infrastructure: CubeIcon,
  Commodities: ShoppingBagIcon,
};

function getAssetIcon(category: string) {
  return CATEGORY_ICONS[category] || CubeIcon;
}

interface AssetCardProps {
  asset: OnChainAsset;
  isConnected: boolean;
  isPurchasing: boolean;
  kycStatus: string;
  onInvestClick: (asset: OnChainAsset) => void;
  selectedAssetId?: number;
}

export const AssetCard = ({
  asset,
  isConnected,
  isPurchasing,
  kycStatus,
  onInvestClick,
  selectedAssetId,
}: AssetCardProps) => {
  const Icon = getAssetIcon(asset.asset_category);
  const progress =
    asset.total_shares > 0n ? Math.round((Number(asset.sold_shares) / Number(asset.total_shares)) * 100) : 0;
  const isTokenized = asset.state.tag === "Tokenized";
  const isCurrentPurchasing = isPurchasing && selectedAssetId === asset.asset_id;
  const needsKyc = isConnected && kycStatus !== "Verified";
  const isDisabled =
    (isConnected && asset.model.tag === "Fractional" && asset.state.tag === "Active") || isPurchasing || needsKyc;

  return (
    <div className="group rounded-3xl border border-base-300 bg-base-100/50 p-6 shadow-xl shadow-primary/5 backdrop-blur-md transition-all hover:border-primary/50 md:p-10">
      <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
        <div className="flex items-start gap-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-primary/5 text-primary shadow-inner transition-colors group-hover:bg-primary/10">
            <Icon className="h-9 w-9" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-semibold text-base-content">{asset.asset_name}</h3>
              <span className={`badge badge-sm ${isTokenized ? "badge-primary" : "badge-success"}`}>
                {asset.state.tag}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-base-content/50">
              <span className="flex items-center gap-1">
                <CubeIcon className="h-3 w-3" /> {asset.asset_category}
              </span>
              <span className="rounded bg-primary/5 px-1.5 font-mono text-primary">{asset.asset_code}</span>
              <span>ID #{asset.asset_id}</span>
              <span className="rounded bg-base-200 px-1.5 py-0.5 font-mono text-[10px]" title={asset.asset_owner}>
                Owner {shortenStellarAddress(asset.asset_owner, 6)}
              </span>
            </div>

            {isTokenized ? (
              <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-base-300 bg-base-300 shadow-sm">
                <div className="flex flex-col justify-center bg-base-100 p-3">
                  <p className="section-label mb-0.5 text-xs">Price per share</p>
                  <p className="text-lg font-semibold text-primary">
                    {(Number(asset.price_per_share) / 1e7).toFixed(2)}{" "}
                    <span className="text-sm font-normal text-base-content/50">USDC</span>
                  </p>
                </div>
                <div className="flex flex-col justify-center bg-base-100 p-3">
                  <p className="section-label mb-0.5 text-xs">Total shares</p>
                  <p className="text-lg font-semibold text-base-content">
                    {asset.total_shares.toString()}{" "}
                    <span className="text-sm font-normal text-base-content/50">shares</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-success/20 bg-success/5 p-3">
                <SparklesIcon className="h-4 w-4 text-success" />
                <p className="text-sm font-medium text-success">Approved · Tokenization in progress</p>
              </div>
            )}

            <Link
              href={`/asset/${asset.asset_id}`}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View details
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="shrink-0">
          {needsKyc && (
            <p className="mb-2 max-w-[200px] text-xs text-base-content/60">
              Complete{" "}
              <Link href="/investor/kyc" className="link link-primary">
                verification
              </Link>{" "}
              to invest.
            </p>
          )}
          <button
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              onInvestClick(asset);
            }}
            disabled={isDisabled}
            className="btn btn-primary btn-lg gap-3 rounded-2xl px-8 shadow-lg shadow-primary/20 stellar-glow"
          >
            {isCurrentPurchasing && <span className="loading loading-bars loading-sm" />}
            {isCurrentPurchasing
              ? asset.model.tag === "WholeOwnership"
                ? "Processing..."
                : "Investing..."
              : !isConnected
                ? "Connect wallet"
                : asset.model.tag === "WholeOwnership"
                  ? "Buy asset"
                  : "Invest"}
            {!isCurrentPurchasing && <ArrowRightIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isTokenized && (
        <div className="mt-8 border-t border-base-200 pt-8">
          <div className="mb-2.5 flex items-end justify-between">
            <span className="section-label">Funding progress</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-base-content/70">
                {asset.sold_shares.toString()} / {asset.total_shares.toString()} sold
              </span>
              <span className="text-sm font-semibold text-primary">{progress}%</span>
            </div>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full border border-base-300/50 bg-base-200 p-0.5 shadow-inner">
            <div
              className="h-full rounded-full bg-primary shadow-lg transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
