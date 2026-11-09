"use client";

import { STATE_CONFIG } from "./constants";
import { CheckCircleIcon, CubeTransparentIcon } from "@heroicons/react/24/outline";
import { shortenStellarAddress } from "~~/services/stellar/horizonClient";
import { toIpfsGatewayUrl } from "~~/services/stellar/ipfsService";
import { AssetStateKey, OnChainAsset } from "~~/types/stellar";

type Props = {
  asset: OnChainAsset;
  onApprove: (e: React.MouseEvent, id: number) => void;
  onTokenize: (asset: OnChainAsset) => void;
  isApproving: boolean;
};

export function AdminAssetRow({ asset, onApprove, onTokenize, isApproving }: Readonly<Props>) {
  const state = asset.state.tag as AssetStateKey;
  const stateConfig = STATE_CONFIG[state] ?? STATE_CONFIG.Pending;
  const StateIcon = stateConfig.icon;
  const progress =
    asset.total_shares > 0n ? Math.round((Number(asset.sold_shares) / Number(asset.total_shares)) * 100) : 0;

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100/50 backdrop-blur-sm p-5 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-lg">{asset.asset_name}</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${stateConfig.color}`}
            >
              <StateIcon className="h-3.5 w-3.5" />
              {stateConfig.label}
            </span>
            <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md">
              {asset.asset_code}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1.5 text-xs text-base-content/60">
            <span>
              <span className="font-semibold text-base-content/80">Category:</span> {asset.asset_category}
            </span>
            <span>
              <span className="font-semibold text-base-content/80">ID:</span> #{asset.asset_id}
            </span>
            <span>
              <span className="font-semibold text-base-content/80">Owner:</span>{" "}
              <span className="font-mono">{shortenStellarAddress(asset.asset_owner)}</span>
            </span>
            <span>
              <span className="font-semibold text-base-content/80">Model:</span> {asset.model.tag}
            </span>
          </div>

          {asset.metadata_uri && (
            <a
              href={toIpfsGatewayUrl(asset.metadata_uri)}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary/70 hover:text-primary mt-1.5 inline-block underline underline-offset-2 break-all"
            >
              {asset.metadata_uri}
            </a>
          )}

          {state === "Tokenized" && asset.total_shares > 0n && (
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-base-content/50 font-semibold uppercase tracking-widest">Round Progress</span>
                <span className="text-primary font-bold">{progress}%</span>
              </div>
              <div className="h-2 w-full bg-base-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-base-content/40 mt-1">
                {asset.sold_shares.toString()} / {asset.total_shares.toString()} shares sold
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          {state === "Pending" && (
            <button
              className="btn btn-success btn-sm gap-1.5"
              onClick={e => onApprove(e, asset.asset_id)}
              disabled={isApproving}
            >
              {isApproving ? (
                <span className="loading loading-bars loading-xs" />
              ) : (
                <CheckCircleIcon className="h-4 w-4" />
              )}
              Approve
            </button>
          )}
          {state === "Active" && asset.model.tag === "Fractional" && (
            <button className="btn btn-primary btn-sm gap-1.5" onClick={() => onTokenize(asset)}>
              <CubeTransparentIcon className="h-4 w-4" />
              Tokenize
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
