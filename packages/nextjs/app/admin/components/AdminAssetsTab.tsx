"use client";

import { useCallback, useRef, useState } from "react";
import { AdminAssetRow } from "./AdminAssetRow";
import { STATE_CONFIG } from "./constants";
import { ArrowPathIcon, ArrowTopRightOnSquareIcon, BanknotesIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import { VaulticLoader } from "~~/components/VaulticLoader";
import { TokenizeModal } from "~~/components/modals/TokenizeModal";
import { getExplorerTxUrl } from "~~/scaffold.config";
import { shortenStellarAddress } from "~~/services/stellar/horizonClient";
import {
  approveAsset,
  fetchAsset,
  fetchTotalAssets,
  getContractIds,
  sweepFees,
} from "~~/services/stellar/sorobanService";
import { AssetStateKey, OnChainAsset } from "~~/types/stellar";
import { notification } from "~~/utils/vaultic";

type Props = {
  publicKey: string;
};

export function AdminAssetsTab({ publicKey }: Readonly<Props>) {
  const contracts = getContractIds();
  const [assets, setAssets] = useState<OnChainAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<AssetStateKey | "All">("All");
  const [isApprovingAsset, setIsApprovingAsset] = useState(false);
  const [isSweeping, setIsSweeping] = useState(false);
  const [tokenizeTarget, setTokenizeTarget] = useState<OnChainAsset | null>(null);
  const lockApproving = useRef(false);
  const lockSweeping = useRef(false);

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const total = await fetchTotalAssets();
      const fetched = await Promise.all(Array.from({ length: total }, (_, i) => fetchAsset(i + 1)));
      setAssets(fetched.filter((a): a is OnChainAsset => a !== null).reverse());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleApprove = async (e: React.MouseEvent, assetId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (isApprovingAsset || lockApproving.current) return;
    lockApproving.current = true;
    setIsApprovingAsset(true);
    const notifId = notification.loading("Approving asset on-chain...");
    try {
      const { hash } = await approveAsset(assetId, publicKey);
      notification.success(
        <div className="flex flex-col gap-1">
          <p className="font-bold">Asset approved! Status set to Active</p>
          <a
            href={getExplorerTxUrl(hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-primary hover:underline flex items-center gap-1"
          >
            Verify on Explorer <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </a>
        </div>,
      );
      await loadAssets();
    } catch (err: unknown) {
      notification.error(`Approval failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setIsApprovingAsset(false);
      lockApproving.current = false;
      notification.remove(notifId);
    }
  };

  const handleSweepFees = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSweeping || lockSweeping.current) return;
    lockSweeping.current = true;
    setIsSweeping(true);
    const notifId = notification.loading("Sweeping protocol fees to treasury...");
    try {
      const { hash } = await sweepFees(publicKey);
      notification.success(
        <div className="flex flex-col gap-1">
          <p className="font-bold">Protocol fees swept to treasury</p>
          <a
            href={getExplorerTxUrl(hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-primary hover:underline flex items-center gap-1"
          >
            Verify on Explorer <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </a>
        </div>,
      );
    } catch (err: unknown) {
      notification.error(`Sweep failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setIsSweeping(false);
      lockSweeping.current = false;
      notification.remove(notifId);
    }
  };

  const filteredAssets = filter === "All" ? assets : assets.filter(a => a.state.tag === filter);
  const counts = (Object.keys(STATE_CONFIG) as AssetStateKey[]).reduce(
    (acc, s) => ({ ...acc, [s]: assets.filter(a => a.state.tag === s).length }),
    {} as Record<AssetStateKey, number>,
  );

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {(Object.keys(STATE_CONFIG) as AssetStateKey[]).map(state => {
          const cfg = STATE_CONFIG[state];
          const Icon = cfg.icon;
          return (
            <button
              key={state}
              onClick={() => setFilter(filter === state ? "All" : state)}
              className={`rounded-2xl border p-4 text-left transition-all hover:scale-[1.02] hover:shadow-lg ${
                filter === state
                  ? "ring-2 ring-primary border-transparent bg-primary/5 shadow-primary/10"
                  : "border-base-300 bg-base-100"
              }`}
            >
              <Icon className={`h-6 w-6 mb-2 ${cfg.color.split(" ")[0]}`} />
              <p className="text-2xl font-black italic">{counts[state] ?? 0}</p>
              <p className="text-[10px] text-base-content/40 font-bold uppercase tracking-[0.2em]">{state}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <button className="btn btn-outline btn-sm gap-2" onClick={loadAssets} disabled={isLoading}>
          <ArrowPathIcon className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>

        <button className="btn btn-warning btn-sm gap-2" onClick={handleSweepFees} disabled={isSweeping}>
          {isSweeping ? <span className="loading loading-bars loading-xs" /> : <BanknotesIcon className="h-4 w-4" />}
          Sweep Protocol Fees
        </button>

        <div className="ml-auto">
          <span className="text-xs text-base-content/40 font-mono">
            Registry:{" "}
            <span className="text-primary">
              {contracts.registry ? shortenStellarAddress(contracts.registry, 6) : "N/A"}
            </span>
          </span>
        </div>
      </div>

      {filter !== "All" && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-base-content/60">Showing:</span>
          <span className={`text-sm font-bold ${STATE_CONFIG[filter].color.split(" ")[0]}`}>{filter}</span>
          <button
            className="text-xs underline text-base-content/40 hover:text-primary"
            onClick={() => setFilter("All")}
          >
            Clear
          </button>
        </div>
      )}

      {isLoading ? (
        <VaulticLoader />
      ) : filteredAssets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-base-300 p-10 text-center">
          <ChartBarIcon className="h-10 w-10 text-base-content/20 mx-auto mb-3" />
          <p className="font-bold text-base-content/50">
            {filter === "All" ? "No assets registered yet." : `No ${filter} assets.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssets.map(asset => (
            <AdminAssetRow
              key={asset.asset_id}
              asset={asset}
              onApprove={handleApprove}
              onTokenize={setTokenizeTarget}
              isApproving={isApprovingAsset}
            />
          ))}
        </div>
      )}

      {tokenizeTarget && (
        <TokenizeModal
          asset={tokenizeTarget}
          publicKey={publicKey}
          onClose={() => setTokenizeTarget(null)}
          onSuccess={async () => {
            setTokenizeTarget(null);
            await loadAssets();
          }}
        />
      )}
    </>
  );
}
