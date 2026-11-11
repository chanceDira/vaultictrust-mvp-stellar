"use client";

import { useCallback, useRef, useState } from "react";
import { AdminAssetRow } from "./AdminAssetRow";
import { ConfirmModal } from "./ConfirmModal";
import { STATE_CONFIG } from "./constants";
import { ArrowPathIcon, ArrowTopRightOnSquareIcon, BanknotesIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import { VaulticLoader } from "~~/components/VaulticLoader";
import { TokenizeModal } from "~~/components/modals/TokenizeModal";
import { getExplorerTxUrl } from "~~/scaffold.config";
import { shortenStellarAddress } from "~~/services/stellar/horizonClient";
import {
  approveAsset,
  archiveAsset,
  burnAsset,
  deleteAsset,
  fetchAsset,
  fetchTotalAssets,
  getContractIds,
  sweepFees,
} from "~~/services/stellar/sorobanService";
import type { AssetStateKey, OnChainAsset } from "~~/types/stellar";
import { notification } from "~~/utils/vaultic";

type ConfirmAction = "archive" | "burn" | "delete";

type PendingConfirm = {
  action: ConfirmAction;
  asset: OnChainAsset;
};

const CONFIRM_CONFIG: Record<
  ConfirmAction,
  { title: string; description: (name: string) => string; label: string; variant: "danger" | "warning" }
> = {
  archive: {
    title: "Archive asset",
    description: name => `"${name}" will be hidden from the marketplace. The on-chain record is preserved.`,
    label: "Archive",
    variant: "warning",
  },
  burn: {
    title: "Burn asset",
    description: name =>
      `"${name}" will be permanently retired. This marks the token supply as burned. This cannot be undone.`,
    label: "Burn",
    variant: "danger",
  },
  delete: {
    title: "Delete asset",
    description: name => `"${name}" will be permanently removed from the registry. This cannot be undone.`,
    label: "Delete",
    variant: "danger",
  },
};

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
  const [isActing, setIsActing] = useState(false);
  const [tokenizeTarget, setTokenizeTarget] = useState<OnChainAsset | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const lockApproving = useRef(false);
  const lockSweeping = useRef(false);

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const total = await fetchTotalAssets();
      const settled = await Promise.allSettled(Array.from({ length: total }, (_, i) => fetchAsset(i + 1)));
      const fetched = settled
        .filter((r): r is PromiseFulfilledResult<OnChainAsset> => r.status === "fulfilled" && r.value !== null)
        .map(r => r.value);
      setAssets(fetched.reverse());
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
          <p className="font-bold">Asset approved. Status set to Active</p>
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

  const handleConfirmedAction = async () => {
    if (!pendingConfirm || isActing) return;
    const { action, asset } = pendingConfirm;
    setIsActing(true);
    const notifId = notification.loading(
      `${action === "archive" ? "Archiving" : action === "burn" ? "Burning" : "Deleting"} asset...`,
    );
    try {
      let hash: string;
      if (action === "archive") {
        ({ hash } = await archiveAsset(asset.asset_id, publicKey));
      } else if (action === "burn") {
        ({ hash } = await burnAsset(asset.asset_id, publicKey));
      } else {
        ({ hash } = await deleteAsset(asset.asset_id, publicKey));
      }
      notification.success(
        <div className="flex flex-col gap-1">
          <p className="font-bold">
            {action === "archive" ? "Asset archived" : action === "burn" ? "Asset burned" : "Asset deleted"}
          </p>
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
      setPendingConfirm(null);
      await loadAssets();
    } catch (err: unknown) {
      notification.error(`Action failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setIsActing(false);
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
      <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {(Object.keys(STATE_CONFIG) as AssetStateKey[]).map(state => {
          const cfg = STATE_CONFIG[state];
          const Icon = cfg.icon;
          return (
            <button
              key={state}
              onClick={() => setFilter(filter === state ? "All" : state)}
              className={`rounded-2xl border p-3 text-left transition-all hover:scale-[1.02] hover:shadow-lg sm:p-4 ${
                filter === state
                  ? "ring-2 ring-primary border-transparent bg-primary/5 shadow-primary/10"
                  : "border-base-300 bg-base-100"
              }`}
            >
              <Icon className={`mb-1.5 h-5 w-5 sm:mb-2 sm:h-6 sm:w-6 ${cfg.color.split(" ")[0]}`} />
              <p className="text-lg font-bold sm:text-xl">{counts[state] ?? 0}</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-base-content/40 sm:text-[10px] sm:tracking-[0.2em]">
                {state}
              </p>
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
              onArchive={asset => setPendingConfirm({ action: "archive", asset })}
              onDelete={asset => setPendingConfirm({ action: "delete", asset })}
              onBurn={asset => setPendingConfirm({ action: "burn", asset })}
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

      {pendingConfirm && (
        <ConfirmModal
          isOpen
          title={CONFIRM_CONFIG[pendingConfirm.action].title}
          description={CONFIRM_CONFIG[pendingConfirm.action].description(pendingConfirm.asset.asset_name)}
          confirmLabel={CONFIRM_CONFIG[pendingConfirm.action].label}
          variant={CONFIRM_CONFIG[pendingConfirm.action].variant}
          isLoading={isActing}
          onConfirm={handleConfirmedAction}
          onClose={() => !isActing && setPendingConfirm(null)}
        />
      )}
    </>
  );
}
