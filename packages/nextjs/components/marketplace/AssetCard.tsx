"use client";

import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  CubeIcon,
  GlobeAltIcon,
  ShoppingBagIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
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

  return (
    <div className="rounded-3xl border border-base-300 bg-base-100/50 backdrop-blur-md p-6 md:p-10 shadow-xl shadow-primary/5 hover:border-primary/50 transition-all group">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-start gap-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/5 text-primary border border-primary/10 shadow-inner group-hover:bg-primary/10 transition-colors">
            <Icon className="h-9 w-9" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-xl text-base-content">{asset.asset_name}</h3>
              <span
                className={`badge badge-sm font-bold uppercase tracking-tighter ${
                  isTokenized ? "badge-primary" : "badge-success"
                }`}
              >
                {asset.state.tag}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-base-content/50 font-medium">
              <span className="flex items-center gap-1">
                <CubeIcon className="h-3 w-3" /> {asset.asset_category}
              </span>
              <span className="text-primary font-mono bg-primary/5 px-1.5 rounded">{asset.asset_code}</span>
              <span>ID: #{asset.asset_id}</span>
            </div>

            {isTokenized ? (
              <div className="mt-5 grid grid-cols-2 gap-px bg-base-300 border border-base-300 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-base-100 p-3 flex flex-col justify-center">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-base-content/40 font-black mb-0.5">
                    Price per Unit
                  </p>
                  <p className="text-lg font-black text-primary italic leading-none">
                    {(Number(asset.price_per_share) / 1e7).toFixed(2)}{" "}
                    <span className="text-[10px] font-bold opacity-60 not-italic">USDC</span>
                  </p>
                </div>
                <div className="bg-base-100 p-3 flex flex-col justify-center">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-base-content/40 font-black mb-0.5">
                    Total Supply
                  </p>
                  <p className="text-lg font-black text-base-content italic leading-none">
                    {asset.total_shares.toString()}{" "}
                    <span className="text-[10px] font-bold opacity-60 not-italic">SHARES</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 p-3 rounded-xl bg-success/5 border border-success/20 flex items-center gap-2">
                <SparklesIcon className="h-4 w-4 text-success" />
                <p className="text-[10px] font-black text-success uppercase tracking-[0.15em]">
                  Verified Asset · Initializing on Stellar
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0">
          <button
            onClick={() => onInvestClick(asset)}
            disabled={
              !isConnected ||
              (asset.model.tag === "Fractional" && asset.state.tag === "Active") ||
              isPurchasing ||
              kycStatus !== "Verified"
            }
            className={`btn btn-primary btn-lg rounded-2xl px-10 gap-3 shadow-lg shadow-primary/20 stellar-glow ${
              isCurrentPurchasing ? "loading" : ""
            }`}
          >
            {isCurrentPurchasing
              ? asset.model.tag === "WholeOwnership"
                ? "Purchasing..."
                : "Investing..."
              : asset.model.tag === "WholeOwnership"
                ? "Buy Whole Asset"
                : "Invest Now"}
            {!isCurrentPurchasing && <ArrowRightIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isTokenized && (
        <div className="mt-8 pt-8 border-t border-base-200">
          <div className="flex justify-between items-end mb-2.5">
            <span className="text-xs font-bold text-base-content/40 uppercase tracking-widest">Funding Progress</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-base-content/70">
                {asset.sold_shares.toString()} / {asset.total_shares.toString()} SOLD
              </span>
              <span className="text-sm font-bold text-primary">{progress}%</span>
            </div>
          </div>
          <div className="h-3 w-full bg-base-200 rounded-full overflow-hidden shadow-inner border border-base-300/50 p-0.5">
            <div
              className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-lg"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
