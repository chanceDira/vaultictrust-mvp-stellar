"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  PlusIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { VaulticLoader } from "~~/components/VaulticLoader";
import { DistributeYieldModal } from "~~/components/modals/DistributeYieldModal";
import { RegisterModal } from "~~/components/modals/RegisterModal";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { ConnectWalletPrompt } from "~~/components/ui/ConnectWalletPrompt";
import { getExplorerAssetUrl, getExplorerTxUrl } from "~~/scaffold.config";
import { shortenStellarAddress } from "~~/services/stellar/horizonClient";
import {
  fetchAsset,
  fetchAssetsByOwner,
  fetchWithdrawableProceeds,
  getContractIds,
  withdrawProceeds,
} from "~~/services/stellar/sorobanService";
import { OnChainAsset } from "~~/types/stellar";
import { notification } from "~~/utils/scaffold-eth";

interface EnrichedOwnerAsset extends OnChainAsset {
  withdrawable: bigint;
  fundingProgress: number;
}

const STATE_STYLE: Record<string, { label: string; badge: string }> = {
  Pending: { label: "Pending Review", badge: "badge-warning" },
  Active: { label: "Listed", badge: "badge-success" },
  Tokenized: { label: "Tokenized", badge: "badge-primary" },
  Closed: { label: "Closed", badge: "badge-error" },
  Relisted: { label: "Relisted", badge: "badge-info" },
};

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
    <div className="flex flex-col grow pb-20 min-h-screen">
      <section className="mx-auto w-full max-w-5xl px-3 py-8 sm:px-4 md:py-12">
        <div className="mb-4">
          <h1 className="page-title">Owner dashboard</h1>
          <p className="section-label mt-1">Register and manage your assets</p>
        </div>
        <p className="page-subtitle mb-8 max-w-2xl">
          Submit assets for review, track tokenization, withdraw USDC proceeds, and distribute yield to investors.
        </p>

        {!isConnected ? (
          <ConnectWalletPrompt
            title="Connect your wallet"
            description="Connect Freighter to register assets and manage listings tied to your Stellar address."
          />
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-3 bg-base-100 px-4 py-2.5 rounded-2xl border border-base-300 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-success shadow-[0_0_8px] shadow-success" />
                <span className="text-xs font-mono font-bold text-base-content/60">
                  {shortenStellarAddress(publicKey ?? "", 10)}
                </span>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="btn btn-primary btn-md stellar-glow w-full gap-2 rounded-2xl px-8 shadow-lg shadow-primary/20 md:w-auto"
              >
                <PlusIcon className="h-5 w-5" />
                Register asset
              </button>
            </div>

            {assets.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-3xl border border-base-300 bg-base-100/40 backdrop-blur-md p-6 shadow-2xl shadow-primary/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-2 text-base-content/40 mb-2">
                    <BuildingOffice2Icon className="h-4 w-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black">Total Assets</span>
                  </div>
                  <p className="text-5xl font-black italic text-base-content leading-none">{assets.length}</p>
                  <p className="mt-2 text-sm text-base-content/50">Registered</p>
                </div>

                <div className="rounded-3xl border border-base-300 bg-gradient-to-br from-base-100/80 to-base-100/40 backdrop-blur-md p-6 shadow-2xl col-span-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="flex items-center gap-2 text-base-content/40 mb-2">
                    <BanknotesIcon className="h-4 w-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black">Total Raised</span>
                  </div>
                  <p className="text-4xl font-black text-success italic leading-none">
                    {totalRaised.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                    <span className="text-xs font-bold opacity-60 not-italic tracking-widest">USDC</span>
                  </p>
                  <p className="mt-2 text-sm text-base-content/50">Across all rounds</p>
                </div>

                <div className="rounded-3xl border border-base-300 bg-base-100/40 backdrop-blur-md p-6 shadow-2xl shadow-primary/5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="flex items-center gap-2 text-base-content/40 mb-2">
                    <SparklesIcon className="h-4 w-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black">Tokenized</span>
                  </div>
                  <div className="flex items-end gap-3">
                    <p className="text-5xl font-black italic text-base-content leading-none">{tokenizedCount}</p>
                    {pendingCount > 0 && (
                      <span className="badge badge-warning badge-sm font-bold mb-1">{pendingCount} Pending</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-base-content/50">Tokenized listings</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h2 className="section-label flex items-center gap-2">
                <SparklesIcon className="h-4 w-4" /> Your registrations
              </h2>

              {isLoading ? (
                <VaulticLoader />
              ) : assets.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-base-300 p-16 text-center bg-base-100/50 italic text-base-content/40">
                  You haven&apos;t registered any assets yet.
                  <button
                    onClick={() => setIsRegisterModalOpen(true)}
                    className="text-primary hover:underline ml-1 not-italic font-bold"
                  >
                    Start here.
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {assets.map(asset => {
                    const tag = stateTag(asset);
                    const style = STATE_STYLE[tag] ?? { label: tag, badge: "badge-ghost" };
                    const isTokenized = tag === "Tokenized" || tag === "Relisted";
                    const isWithdrawing = withdrawingId === asset.asset_id;
                    const withdrawableUsdc = Number(asset.withdrawable) / 1e7;

                    return (
                      <div
                        key={asset.asset_id}
                        className="rounded-3xl border border-base-300 bg-base-100/40 backdrop-blur-md p-6 md:p-8 shadow-xl shadow-primary/5 hover:border-primary/40 transition-all group"
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                          <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 group-hover:bg-primary/10 transition-colors shrink-0">
                              <BuildingOffice2Icon className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <p className="font-bold text-lg text-base-content">{asset.asset_name}</p>
                                <span className={`badge badge-sm font-bold uppercase tracking-tighter ${style.badge}`}>
                                  {style.label}
                                </span>
                                <span className="font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
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
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {tag === "Pending" && (
                              <div className="flex items-center gap-1.5 text-warning text-xs font-bold uppercase tracking-widest bg-warning/10 px-3 py-1.5 rounded-xl border border-warning/20">
                                <ClockIcon className="h-3.5 w-3.5" /> Awaiting Admin Review
                              </div>
                            )}
                            {tag === "Active" && (
                              <div className="flex items-center gap-1.5 text-success text-xs font-bold uppercase tracking-widest bg-success/10 px-3 py-1.5 rounded-xl border border-success/20">
                                <CheckCircleIcon className="h-3.5 w-3.5" />
                                {asset.model?.tag === "WholeOwnership"
                                  ? "Listed on Marketplace"
                                  : "Ready for Tokenization"}
                              </div>
                            )}
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
                                  Distribute Yield
                                </button>
                                <Link
                                  href={`/asset/${asset.asset_id}`}
                                  className="btn btn-primary btn-outline btn-sm gap-2 rounded-xl"
                                >
                                  View Page <ArrowRightIcon className="h-3 w-3" />
                                </Link>
                              </>
                            )}
                          </div>
                        </div>

                        {isTokenized && (
                          <div className="mt-6 pt-6 border-t border-base-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-bold text-base-content/40 uppercase tracking-widest">
                                  Funding Progress
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-mono text-base-content/70">
                                    {asset.sold_shares?.toString() ?? "0"} / {asset.total_shares?.toString() ?? "0"}{" "}
                                    sold
                                  </span>
                                  <span className="text-sm font-bold text-primary">{asset.fundingProgress}%</span>
                                </div>
                              </div>
                              <div className="h-3 w-full bg-base-200 rounded-full overflow-hidden shadow-inner border border-base-300/50 p-0.5">
                                <div
                                  className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-lg"
                                  style={{ width: `${asset.fundingProgress}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-base-content/40 mt-1.5">
                                Price per share:{" "}
                                <span className="font-semibold text-base-content/60">
                                  ${(Number(asset.price_per_share ?? 0n) / 1e7).toFixed(2)} USDC
                                </span>
                              </p>
                            </div>

                            <div className="bg-base-200/50 rounded-2xl border border-base-300 p-4 flex flex-col justify-between">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-1">
                                  Withdrawable Proceeds
                                </p>
                                <p className="text-2xl font-black text-success italic">
                                  {withdrawableUsdc.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}{" "}
                                  <span className="text-xs font-bold opacity-60 not-italic">USDC</span>
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

            <div className="rounded-[2.5rem] bg-primary/5 p-10 border border-primary/10 flex flex-col md:flex-row items-center gap-8 shadow-2xl shadow-primary/5">
              <div className="h-20 w-20 rounded-3xl bg-base-100 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-xl">
                <DocumentTextIcon className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Compliance review</h3>
                <p className="max-w-xl text-sm leading-relaxed text-base-content/60">
                  Assets are reviewed by admins before listing. Soroban contracts record lifecycle states and investment
                  activity on Stellar.
                </p>
              </div>
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
