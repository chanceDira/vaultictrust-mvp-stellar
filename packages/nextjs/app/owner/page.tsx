"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, ArrowTopRightOnSquareIcon, BanknotesIcon, PlusIcon } from "@heroicons/react/24/outline";
import { VaulticLoader } from "~~/components/VaulticLoader";
import { DistributeYieldModal } from "~~/components/modals/DistributeYieldModal";
import { RegisterModal } from "~~/components/modals/RegisterModal";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { ConnectWalletPrompt } from "~~/components/ui/ConnectWalletPrompt";
import { CopyAddress } from "~~/components/ui/CopyAddress";
import { getExplorerAssetUrl, getExplorerTxUrl } from "~~/scaffold.config";
import {
  fetchAsset,
  fetchAssetsByOwner,
  fetchWithdrawableProceeds,
  getContractIds,
  withdrawProceeds,
} from "~~/services/stellar/sorobanService";
import { type AssetStateKey, OnChainAsset } from "~~/types/stellar";
import { notification } from "~~/utils/vaultic";
import { listingStatusLabel } from "~~/utils/vaultic/listingLabels";

interface EnrichedOwnerAsset extends OnChainAsset {
  withdrawable: bigint;
  fundingProgress: number;
}

export default function OwnerPage() {
  const { isConnected, publicKey } = useStellarWallet();
  const [assets, setAssets] = useState<EnrichedOwnerAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isYieldModalOpen, setIsYieldModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<OnChainAsset | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);
  const lockWithdrawing = useRef(false);

  const contracts = getContractIds();
  const isDeployed = !!contracts.registry;

  const loadOwnerAssets = useCallback(async () => {
    if (!publicKey || !isDeployed) return;
    setIsLoading(true);
    try {
      const ids = await fetchAssetsByOwner(publicKey);
      const items: EnrichedOwnerAsset[] = [];
      for (const id of ids) {
        const asset = await fetchAsset(id);
        if (!asset) continue;

        let withdrawable = 0n;
        let fundingProgress = 0;
        try {
          if (asset.state.tag === "Tokenized" || asset.state.tag === "Relisted") {
            withdrawable = await fetchWithdrawableProceeds(asset.asset_id);
          }
          if (asset.total_shares > 0n) {
            fundingProgress = Math.round((Number(asset.sold_shares) / Number(asset.total_shares)) * 100);
          }
        } catch {}

        items.push({ ...(asset as OnChainAsset), withdrawable, fundingProgress });
      }
      setAssets(items.reverse());
    } catch (e: any) {
      console.error("Failed to load owner assets:", e);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, isDeployed]);

  useEffect(() => {
    loadOwnerAssets();
  }, [loadOwnerAssets]);

  const handleWithdraw = async (e: React.MouseEvent, asset: EnrichedOwnerAsset) => {
    e.preventDefault();
    e.stopPropagation();
    if (!publicKey || withdrawingId !== null || lockWithdrawing.current) return;
    lockWithdrawing.current = true;
    setWithdrawingId(asset.asset_id);
    const notifId = notification.loading(`Withdrawing proceeds for ${asset.asset_name}...`);
    try {
      const { hash } = await withdrawProceeds(asset.asset_id, publicKey);
      notification.success(
        <div className="flex flex-col gap-1">
          <p className="font-bold">Proceeds withdrawn!</p>
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
      await loadOwnerAssets();
    } catch (err: any) {
      notification.error(`Withdrawal failed: ${err.message || "Unknown error"}`);
    } finally {
      setWithdrawingId(null);
      lockWithdrawing.current = false;
      notification.remove(notifId);
    }
  };

  const totalRaised = assets.reduce((acc, a) => {
    const sold = Number(a.sold_shares ?? 0n);
    const price = Number(a.price_per_share ?? 0n) / 1e7;
    return acc + sold * price;
  }, 0);
  const pendingCount = assets.filter(a => a.state.tag === "Pending").length;
  const tokenizedCount = assets.filter(a => a.state.tag === "Tokenized" || a.state.tag === "Relisted").length;

  const stateTag = (asset: EnrichedOwnerAsset) => asset.state?.tag ?? (asset.state as unknown as string);

  return (
    <div className="flex grow flex-col">
      <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="mb-10 text-center md:text-left">
          <h1 className="page-title">Owner dashboard</h1>
          <p className="page-subtitle mt-2">Send an asset for review, then pay investors in USDC when you are ready.</p>
        </div>

        {!isConnected ? (
          <ConnectWalletPrompt
            title="Connect your wallet"
            description="Connect a Stellar wallet to register assets and manage listings tied to your address."
          />
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {publicKey ? (
                <div className="w-full max-w-sm rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <CopyAddress label="Your wallet" address={publicKey} />
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="btn btn-primary btn-sm w-full gap-2 rounded-xl sm:w-auto"
              >
                <PlusIcon className="h-4 w-4" />
                Register asset
              </button>
            </div>

            {assets.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
                  <p className="text-xs font-medium text-base-content/55">Total assets</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums">{assets.length}</p>
                  <p className="mt-1 text-sm font-medium text-base-content/60">Registered</p>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
                  <p className="text-xs font-medium text-base-content/55">Total raised</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-success">
                    {totalRaised.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="ml-2 text-sm font-semibold text-base-content/60">USDC</span>
                  </p>
                  <p className="mt-1 text-sm font-medium text-base-content/60">Across all rounds</p>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
                  <p className="text-xs font-medium text-base-content/55">Shares for sale</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums">{tokenizedCount}</p>
                  <p className="mt-1 text-sm font-medium text-base-content/60">
                    {pendingCount > 0 ? `${pendingCount} waiting for review` : "Live listings"}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-base-content">Your registrations</h2>

              {isLoading ? (
                <VaulticLoader />
              ) : assets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 p-8 text-center text-sm font-medium text-base-content/70 sm:p-10">
                  You haven&apos;t registered any assets yet.
                  <button
                    onClick={() => setIsRegisterModalOpen(true)}
                    className="ml-1 font-bold text-primary hover:underline"
                  >
                    Start here.
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {assets.map(asset => {
                    const tag = stateTag(asset);
                    const isTokenized = tag === "Tokenized" || tag === "Relisted";
                    const isWithdrawing = withdrawingId === asset.asset_id;
                    const withdrawableUsdc = Number(asset.withdrawable) / 1e7;

                    return (
                      <div
                        key={asset.asset_id}
                        className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm sm:p-6"
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                          <div className="min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold text-base-content">{asset.asset_name}</p>
                              <span className="rounded-md bg-base-200 px-2 py-0.5 text-xs font-semibold text-base-content/70">
                                {listingStatusLabel(tag as AssetStateKey)}
                              </span>
                              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                {asset.asset_code}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-base-content/40">
                              <span>{asset.asset_category}</span>
                              <span>
                                Valuation:{" "}
                                <span className="text-base-content/70 font-semibold">
                                  ${(Number(asset.valuation) / 1e7).toLocaleString()} USDC
                                </span>
                              </span>
                              <a
                                href={getExplorerAssetUrl(asset.asset_code, asset.issuer ?? "")}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1 opacity-70 hover:opacity-100"
                              >
                                Explorer <ArrowTopRightOnSquareIcon className="h-2.5 w-2.5" />
                              </a>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {isTokenized && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedAsset(asset);
                                    setIsYieldModalOpen(true);
                                  }}
                                  className="btn btn-primary btn-sm gap-2 rounded-xl"
                                >
                                  <BanknotesIcon className="h-4 w-4" />
                                  Distribute yield
                                </button>
                                <Link
                                  href={`/asset/${asset.asset_id}`}
                                  className="btn btn-primary btn-outline btn-sm gap-2 rounded-xl"
                                >
                                  View listing <ArrowRightIcon className="h-3 w-3" />
                                </Link>
                              </>
                            )}
                          </div>
                        </div>

                        {isTokenized && (
                          <div className="mt-6 pt-6 border-t border-base-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-medium text-base-content/55">Funding progress</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-mono text-base-content/70">
                                    {asset.sold_shares?.toString() ?? "0"} / {asset.total_shares?.toString() ?? "0"}{" "}
                                    sold
                                  </span>
                                  <span className="text-sm font-bold text-primary">{asset.fundingProgress}%</span>
                                </div>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-base-200">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${asset.fundingProgress}%` }}
                                />
                              </div>
                              <p className="mt-1.5 text-xs text-base-content/50">
                                Price per share:{" "}
                                <span className="font-semibold text-base-content/60">
                                  ${(Number(asset.price_per_share ?? 0n) / 1e7).toFixed(2)} USDC
                                </span>
                              </p>
                            </div>

                            <div className="bg-base-200/50 rounded-2xl border border-base-300 p-4 flex flex-col justify-between">
                              <div>
                                <p className="mb-1 text-xs font-medium text-base-content/55">Withdrawable proceeds</p>
                                <p className="text-xl font-bold text-success">
                                  {withdrawableUsdc.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}{" "}
                                  <span className="text-xs font-semibold text-base-content/60">USDC</span>
                                </p>
                              </div>
                              <button
                                className="btn btn-success btn-sm mt-3 gap-2 rounded-xl w-full"
                                disabled={withdrawableUsdc <= 0 || isWithdrawing}
                                onClick={e => handleWithdraw(e, asset)}
                              >
                                {isWithdrawing ? (
                                  <span className="loading loading-bars loading-xs" />
                                ) : (
                                  <BanknotesIcon className="h-4 w-4" />
                                )}
                                Withdraw USDC
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {isRegisterModalOpen && publicKey && (
        <RegisterModal
          publicKey={publicKey}
          onClose={() => setIsRegisterModalOpen(false)}
          onSuccess={async () => {
            setIsRegisterModalOpen(false);
            await loadOwnerAssets();
          }}
        />
      )}
      {isYieldModalOpen && selectedAsset && publicKey && (
        <DistributeYieldModal
          asset={selectedAsset}
          publicKey={publicKey}
          isOpen={isYieldModalOpen}
          onClose={() => setIsYieldModalOpen(false)}
          onSuccess={async () => {
            setIsYieldModalOpen(false);
            await loadOwnerAssets();
          }}
        />
      )}
    </div>
  );
}
