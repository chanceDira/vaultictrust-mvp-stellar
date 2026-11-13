"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowPathIcon, ArrowRightIcon, ArrowTopRightOnSquareIcon, BanknotesIcon } from "@heroicons/react/24/outline";
import { RpcErrorBoundary } from "~~/components/RpcErrorBoundary";
import { VaulticLoader } from "~~/components/VaulticLoader";
import { ActivityFeed } from "~~/components/activity/ActivityFeed";
import { WalletOffers } from "~~/components/investor/WalletOffers";
import { KycStatusBadge } from "~~/components/stellar/KycStatusBadge";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { ConnectWalletPrompt } from "~~/components/ui/ConnectWalletPrompt";
import { CopyAddress } from "~~/components/ui/CopyAddress";
import { useStellarHoldings } from "~~/hooks/stellar/useStellarHoldings";
import { getExplorerAssetUrl, getExplorerTxUrl } from "~~/scaffold.config";
import {
  claimAllYield,
  fetchAsset,
  fetchClaimableYield,
  fetchInvestorHoldings,
  fetchPool,
  fetchTotalAssets,
  fetchUserRecord,
  getContractIds,
} from "~~/services/stellar/sorobanService";
import { notification } from "~~/utils/vaultic";

interface YieldInfo {
  assetId: number;
  assetCode: string;
  claimable: bigint;
}

interface EnrichedHolding {
  assetId: number;
  assetName: string;
  assetCode: string;
  assetIssuer: string;
  balance: number;
  price: number;
  value: number;
  ownershipPercent: number;
  totalShares: number;
  source: "contract" | "horizon";
}

export default function InvestorPage() {
  const { isConnected, publicKey } = useStellarWallet();
  const { holdings: horizonHoldings } = useStellarHoldings(publicKey);
  const [enrichedHoldings, setEnrichedHoldings] = useState<EnrichedHolding[]>([]);
  const [isHoldingsLoading, setIsHoldingsLoading] = useState(false);
  const [yields, setYields] = useState<YieldInfo[]>([]);
  const [isYieldLoading, setIsYieldLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const lockClaiming = useRef(false);
  const [kycRecord, setKycRecord] = useState<any>(null);
  const [isKycLoading, setIsKycLoading] = useState(false);

  const contracts = getContractIds();
  const isDeployed = !!contracts.registry && !!contracts.investmentManager;
  const offerHoldings = useMemo(
    () => enrichedHoldings.map(holding => ({ assetId: holding.assetId, assetCode: holding.assetCode })),
    [enrichedHoldings],
  );

  const loadContractPositions = useCallback(async () => {
    if (!publicKey || !isDeployed) return;
    setIsHoldingsLoading(true);
    try {
      const total = await fetchTotalAssets();
      const assetIndices = Array.from({ length: total }, (_, i) => i + 1);

      const results = await Promise.all(
        assetIndices.map(async i => {
          try {
            const asset = await fetchAsset(i);
            if (!asset || asset.state.tag === "Pending" || asset.state.tag === "Active") return null;

            const sharesHeld = await fetchInvestorHoldings(i, publicKey);
            const balance = Number(sharesHeld);
            if (balance <= 0) return null;

            let price = 0;
            let totalShares = Number(asset.total_shares);
            try {
              const pool = await fetchPool(i);
              if (pool) {
                price = Number(pool.price_per_share) / 1e7;
                totalShares = Number(pool.total_shares);
              } else {
                price = Number(asset.price_per_share) / 1e7;
              }
            } catch {
              price = Number(asset.price_per_share) / 1e7;
            }

            const value = balance * price;
            const ownershipPercent = totalShares > 0 ? (balance / totalShares) * 100 : 0;

            const horizonMatch = horizonHoldings.find(
              h => h.asset_code === asset.asset_code && Number.parseFloat(h.balance) > 0,
            );

            return {
              assetId: asset.asset_id,
              assetName: asset.asset_name,
              assetCode: asset.asset_code,
              assetIssuer: horizonMatch?.asset_issuer ?? asset.issuer ?? "",
              balance,
              price,
              value,
              ownershipPercent,
              totalShares,
              source: horizonMatch ? "horizon" : "contract",
            } as EnrichedHolding;
          } catch (err) {
            console.error(`[InvestorPage] Error loading asset ${i}:`, err);
            return null;
          }
        }),
      );

      setEnrichedHoldings(results.filter((x): x is EnrichedHolding => x !== null));
    } catch (e) {
      console.error("Failed to load contract positions:", e);
    } finally {
      setIsHoldingsLoading(false);
    }
  }, [publicKey, isDeployed, horizonHoldings]);

  const loadYields = useCallback(async () => {
    if (!publicKey || enrichedHoldings.length === 0) return;
    setIsYieldLoading(true);
    try {
      const yieldResults = await Promise.all(
        enrichedHoldings.map(async holding => {
          try {
            const claimable = await fetchClaimableYield(holding.assetId, publicKey);
            if (claimable > 0n) {
              return {
                assetId: holding.assetId,
                assetCode: holding.assetCode,
                claimable,
              } as YieldInfo;
            }
          } catch (e) {
            console.error(`[InvestorPage] Yield fetch failed for ${holding.assetCode}:`, e);
          }
          return null;
        }),
      );
      setYields(yieldResults.filter((x): x is YieldInfo => x !== null));
    } catch (e) {
      console.error("Yield fetch orchestration failed:", e);
    } finally {
      setIsYieldLoading(false);
    }
  }, [publicKey, enrichedHoldings]);

  const loadKyc = useCallback(async () => {
    if (!publicKey || !isDeployed) return;
    setIsKycLoading(true);
    try {
      const record = await fetchUserRecord(publicKey);
      setKycRecord(record);
    } catch (e) {
      console.error("KYC load error", e);
    } finally {
      setIsKycLoading(false);
    }
  }, [publicKey, isDeployed]);

  useEffect(() => {
    loadContractPositions();
    loadKyc();
  }, [loadContractPositions, loadKyc]);

  useEffect(() => {
    loadYields();
  }, [loadYields]);

  const handleClaimYield = async (e: React.MouseEvent, assetId: number, assetCode: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!publicKey || isClaiming || lockClaiming.current) return;
    lockClaiming.current = true;
    setIsClaiming(true);
    const notifId = notification.loading(`Claiming yield for ${assetCode}...`);
    try {
      const { hash } = await claimAllYield(assetId, publicKey);
      notification.success(
        <div className="flex flex-col gap-1">
          <p className="font-bold">Yield claimed!</p>
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
      await loadYields();
    } catch (e: any) {
      notification.error(`Claim failed: ${e.message}`);
    } finally {
      setIsClaiming(false);
      lockClaiming.current = false;
      notification.remove(notifId);
    }
  };

  const portfolioValue = enrichedHoldings.reduce((acc, curr) => acc + curr.value, 0);
  const kycStatus = typeof kycRecord?.status === "string" ? kycRecord.status : kycRecord?.status?.tag;
  const canClaim = kycStatus === "Verified";

  return (
    <div className="flex grow flex-col">
      <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="mb-10 flex flex-col items-center gap-4 text-center md:flex-row md:items-end md:justify-between md:text-left">
          <div className="w-full md:max-w-xl">
            <div className="flex flex-col items-center gap-3 md:flex-row">
              <h1 className="page-title">Investment portfolio</h1>
              {isConnected && !isKycLoading ? <KycStatusBadge status={kycStatus ?? "None"} /> : null}
            </div>
            <p className="page-subtitle mt-2">See the shares you hold, and claim USDC when an owner pays yield.</p>
          </div>
          {isConnected ? (
            <button
              type="button"
              onClick={() => {
                loadContractPositions();
                loadKyc();
              }}
              className="btn btn-ghost btn-sm gap-2 rounded-xl"
              disabled={isHoldingsLoading}
            >
              {isHoldingsLoading ? (
                <span className="loading loading-bars loading-xs" />
              ) : (
                <ArrowPathIcon className="h-4 w-4" />
              )}
              Refresh
            </button>
          ) : null}
        </div>

        {!isConnected ? (
          <ConnectWalletPrompt
            title="Connect your wallet"
            description="Connect a Stellar wallet to view holdings and claim dividends tied to your address."
          />
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
                <p className="text-xs font-medium text-base-content/55">Total assets held</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-base-content">{enrichedHoldings.length}</p>
                <p className="mt-1 text-sm font-medium text-base-content/60">On-chain positions</p>
              </div>
              <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm md:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-base-content/55">Portfolio valuation</p>
                  {isYieldLoading ? <span className="loading loading-bars loading-xs text-primary" /> : null}
                </div>
                <p className="mt-2 text-3xl font-bold tabular-nums text-success">
                  {portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="ml-2 text-sm font-semibold text-base-content/60">USDC</span>
                </p>
                {publicKey ? (
                  <div className="mt-4 max-w-xs border-t border-base-200 pt-4">
                    <CopyAddress label="Your wallet" address={publicKey} />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <RpcErrorBoundary label="holdings">
                <div className="space-y-4">
                  <h2 className="text-sm font-semibold text-base-content">Your positions</h2>
                  {isHoldingsLoading ? (
                    <VaulticLoader />
                  ) : enrichedHoldings.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 p-8 text-center sm:p-10">
                      <p className="text-sm font-medium text-base-content/70">
                        You do not hold any VTrust Africa shares yet.
                      </p>
                      <Link href="/marketplace" className="btn btn-primary btn-sm mt-4 gap-2 rounded-xl">
                        Explore marketplace
                        <ArrowRightIcon className="h-4 w-4" />
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {enrichedHoldings.map(holding => (
                        <article
                          key={`${holding.assetCode}-${holding.assetId}`}
                          className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm sm:p-5"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-primary">{holding.assetCode}</p>
                              <Link
                                href={`/asset/${holding.assetId}`}
                                className="mt-1 block text-base font-semibold text-base-content hover:text-primary"
                              >
                                {holding.assetName}
                              </Link>
                              <p className="mt-1 text-xs font-medium text-base-content/55">
                                {holding.balance.toLocaleString()} shares · {holding.ownershipPercent.toFixed(2)}% of
                                the listing
                                {holding.source === "horizon" ? " · In your wallet" : ""}
                              </p>
                            </div>
                            <div className="min-w-0 sm:text-right">
                              <p className="text-xs font-medium text-base-content/55">Value</p>
                              <p className="mt-0.5 text-base font-bold tabular-nums text-base-content">
                                $
                                {holding.value.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                              <p className="text-xs font-medium text-base-content/50">
                                {holding.price.toFixed(2)} USDC a share
                              </p>
                              {holding.assetIssuer ? (
                                <a
                                  href={getExplorerAssetUrl(holding.assetCode, holding.assetIssuer)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                                >
                                  Explorer
                                  <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </RpcErrorBoundary>

              <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-base-content">Dividends</h2>
                {yields.length === 0 ? (
                  <p className="mt-4 text-sm font-medium text-base-content/60">No unclaimed yield for your shares.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {yields.map(y => (
                      <div
                        key={y.assetId}
                        className="flex items-center justify-between gap-3 border-b border-base-200 pb-3 last:border-0 last:pb-0"
                      >
                        <div>
                          <p className="text-sm font-semibold">{y.assetCode}</p>
                          <p className="text-xs font-medium text-success">Ready to claim</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold tabular-nums">
                            {(Number(y.claimable) / 1e7).toFixed(2)} USDC
                          </p>
                          <button
                            type="button"
                            onClick={e => handleClaimYield(e, y.assetId, y.assetCode)}
                            disabled={isClaiming || !canClaim}
                            className="text-xs font-semibold text-primary hover:underline disabled:opacity-40"
                          >
                            Claim
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-4 text-sm font-medium leading-relaxed text-base-content/60">
                  Yield is paid in USDC to your wallet, in proportion to the shares you hold.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm mt-4 w-full gap-2 rounded-xl"
                  disabled={yields.length === 0 || isClaiming || !canClaim}
                  onClick={e => yields.length > 0 && handleClaimYield(e, yields[0].assetId, "All Assets")}
                >
                  {isClaiming ? (
                    <span className="loading loading-bars loading-xs" />
                  ) : (
                    <BanknotesIcon className="h-4 w-4" />
                  )}
                  Claim all yield
                </button>
              </div>
            </div>
            {publicKey ? <WalletOffers holdings={offerHoldings} holdingsLoading={isHoldingsLoading} /> : null}
            {publicKey ? <ActivityFeed account={publicKey} exportCsv /> : null}
          </div>
        )}
      </section>
    </div>
  );
}
