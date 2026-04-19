"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  BanknotesIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  ClockIcon,
  CubeIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { KycStatusBadge } from "~~/components/stellar/KycStatusBadge";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { useStellarHoldings } from "~~/hooks/stellar/useStellarHoldings";
import { shortenStellarAddress } from "~~/services/stellar/horizonClient";
import {
  claimAllYield,
  fetchAsset,
  fetchClaimableYield,
  fetchTotalAssets,
  fetchUserRecord,
  getContractIds,
} from "~~/services/stellar/sorobanService";
import { notification } from "~~/utils/scaffold-eth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface YieldInfo {
  assetId: number;
  assetCode: string;
  claimable: bigint;
}

// ---------------------------------------------------------------------------
// Investor Page
// ---------------------------------------------------------------------------

export default function InvestorPage() {
  const { isConnected, publicKey } = useStellarWallet();
  const { holdings, isLoading: isHoldingsLoading } = useStellarHoldings(publicKey);
  const [assetMapping, setAssetMapping] = useState<Record<string, number>>({});
  const [yields, setYields] = useState<YieldInfo[]>([]);
  const [isYieldLoading, setIsYieldLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [kycRecord, setKycRecord] = useState<any>(null);
  const [isKycLoading, setIsKycLoading] = useState(false);

  const contracts = getContractIds();
  const isDeployed = !!contracts.registry;

  // Build mapping of Asset Code -> On-chain Asset ID
  const loadAssetMapping = useCallback(async () => {
    if (!isDeployed) return;
    try {
      const total = await fetchTotalAssets();
      const mapping: Record<string, number> = {};
      for (let i = 1; i <= total; i++) {
        const asset = await fetchAsset(i);
        if (asset) {
          mapping[asset.asset_code] = asset.asset_id;
        }
      }
      setAssetMapping(mapping);
    } catch (e) {
      console.error("Mapping fetch failed:", e);
    }
  }, [isDeployed]);

  // Fetch yield for all held assets
  const loadYields = useCallback(async () => {
    if (!publicKey || Object.keys(assetMapping).length === 0) return;
    setIsYieldLoading(true);
    try {
      const yieldResults: YieldInfo[] = [];
      for (const holding of holdings) {
        const assetId = assetMapping[holding.asset_code];
        if (assetId !== undefined) {
          const claimable = await fetchClaimableYield(assetId, publicKey);
          if (claimable > 0n) {
            yieldResults.push({
              assetId,
              assetCode: holding.asset_code,
              claimable,
            });
          }
        }
      }
      setYields(yieldResults);
    } catch (e) {
      console.error("Yield fetch failed:", e);
    } finally {
      setIsYieldLoading(false);
    }
  }, [publicKey, holdings, assetMapping]);

  // Load KYC status
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
    loadAssetMapping();
    loadKyc();
  }, [loadAssetMapping, loadKyc]);

  useEffect(() => {
    loadYields();
  }, [loadYields]);

  const handleClaimYield = async (assetId: number, assetCode: string) => {
    if (!publicKey) return;
    setIsClaiming(true);
    const notifId = notification.loading(`Claiming yield for ${assetCode}...`);
    try {
      await claimAllYield(assetId, publicKey);
      notification.success(`Dividends for ${assetCode} claimed successfully!`);
      await loadYields();
    } catch (e: any) {
      notification.error(`Claim failed: ${e.message}`);
    } finally {
      setIsClaiming(false);
      notification.remove(notifId);
    }
  };

  const totalClaimableYield = yields.reduce((acc, curr) => acc + curr.claimable, 0n);

  return (
    <div className="flex flex-col grow bg-base-200/20 min-h-screen">
      <section className="px-4 py-8 md:py-12 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <ChartBarIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-base-content uppercase tracking-tight">Investor Portfolio</h1>
              {isConnected && !isKycLoading && (
                <KycStatusBadge
                  status={typeof kycRecord?.status === "string" ? kycRecord.status : kycRecord?.status?.tag}
                />
              )}
            </div>
            <p className="text-xs text-base-content/50 uppercase tracking-widest font-semibold">
              Manage Holdings & Claim Yield
            </p>
          </div>
        </div>
        <p className="text-base-content/70 mb-8 max-w-2xl leading-relaxed">
          Track your fractional real-world asset positions and manage automated yield distributions. Your dashboard for
          liquidity in the African real economy.
        </p>

        {/* Not connected */}
        {!isConnected ? (
          <div className="rounded-3xl border border-dashed border-base-300 p-12 text-center bg-base-100 shadow-sm">
            <WalletIcon className="h-16 w-16 text-base-content/20 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-base-content mb-2">Connect Your Wallet</h2>
            <p className="text-base-content/60 mb-8 max-w-sm mx-auto">
              Connect Freighter to view your tokenized holdings and claim accumulated dividends.
            </p>
            <StellarConnectButton />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top Bar Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-base-content/40 mb-1">
                  <CubeIcon className="h-4 w-4" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Total Assets Held</span>
                </div>
                <p className="text-3xl font-bold text-base-content">{holdings.length}</p>
                <p className="text-xs text-primary font-semibold mt-1">Verified on Stellar</p>
              </div>

              <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm col-span-1 md:col-span-2 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-base-content/40">
                    <BanknotesIcon className="h-4 w-4" />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Accrued Claimable Yield</span>
                  </div>
                  {isYieldLoading && <span className="loading loading-spinner loading-xs text-primary" />}
                </div>
                <div className="flex items-end justify-between mt-2">
                  <p className="text-3xl font-bold text-success">
                    {(Number(totalClaimableYield) / 1e7).toFixed(2)}{" "}
                    <span className="text-sm font-medium opacity-60">USDC</span>
                  </p>
                  <p className="text-xs text-base-content/40 font-mono">{shortenStellarAddress(publicKey || "")}</p>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* holdings list */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-base-content/40 flex items-center gap-2">
                  <CheckBadgeIcon className="h-4 w-4" /> Your Active Positions
                </h3>

                {isHoldingsLoading ? (
                  <div className="py-12 text-center">
                    <span className="loading loading-dots loading-md text-primary" />
                  </div>
                ) : holdings.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-base-300 p-12 text-center bg-base-100/50">
                    <p className="text-sm text-base-content/40 italic">You don&apos;t hold any Vaultic assets yet.</p>
                    <Link href="/marketplace" className="btn btn-primary btn-sm mt-4 gap-2">
                      Explore Marketplace
                      <ArrowRightIcon className="h-3 w-3" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {holdings.map(holding => (
                      <div
                        key={holding.asset_code}
                        className="rounded-2xl border border-base-300 bg-base-100 p-5 hover:border-primary/30 transition-all flex items-center justify-between shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 shadow-inner">
                            <CubeIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold text-base-content">{holding.asset_code}</p>
                            <p className="text-[10px] text-base-content/40 font-mono">
                              Issuer: {shortenStellarAddress(holding.asset_issuer, 6)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-base-content">
                            {Number.parseFloat(holding.balance).toLocaleString()}{" "}
                            <span className="text-xs font-normal opacity-50">Shares</span>
                          </p>
                          <a
                            href={`https://stellar.expert/explorer/testnet/asset/${holding.asset_code}-${holding.asset_issuer}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary hover:underline flex items-center justify-end gap-1 mt-0.5"
                          >
                            Explore Asset <ArrowTopRightOnSquareIcon className="h-2 w-2" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Yield Claim Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-base-content/40 flex items-center gap-2">
                  <ClockIcon className="h-4 w-4" /> Payout Schedule
                </h3>
                <div className="rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <p className="font-bold text-base-content mb-4 text-sm">Accumulated Dividends</p>

                  {yields.length === 0 ? (
                    <div className="text-center py-6">
                      <BanknotesIcon className="h-8 w-8 text-base-content/10 mx-auto mb-2" />
                      <p className="text-xs text-base-content/40 italic">No unclaimed yield found for your holdings.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 mb-6">
                      {yields.map(y => (
                        <div
                          key={y.assetId}
                          className="flex items-center justify-between border-b border-base-200 pb-3 last:border-0 last:pb-0"
                        >
                          <div>
                            <p className="font-bold text-sm">{y.assetCode}</p>
                            <p className="text-[10px] text-success font-bold uppercase">Ready to claim</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">{(Number(y.claimable) / 1e7).toFixed(2)} USDC</p>
                            <button
                              onClick={() => handleClaimYield(y.assetId, y.assetCode)}
                              disabled={
                                isClaiming ||
                                (typeof kycRecord?.status === "string" ? kycRecord.status : kycRecord?.status?.tag) !==
                                  "Verified"
                              }
                              className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest mt-0.5 disabled:opacity-30"
                            >
                              Claim This Asset
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-4 border-t border-base-200">
                    <p className="text-[10px] text-base-content/40 mb-3 leading-relaxed">
                      Yield is distributed in USDC directly to your Stellar wallet based on your fractional asset
                      ownership percentage.
                    </p>
                    <button
                      className="btn btn-success btn-sm w-full gap-2 rounded-xl border-success/30"
                      disabled={
                        yields.length === 0 ||
                        isClaiming ||
                        (typeof kycRecord?.status === "string" ? kycRecord.status : kycRecord?.status?.tag) !==
                          "Verified"
                      }
                      onClick={() => yields.length > 0 && handleClaimYield(yields[0].assetId, "All Assets")}
                    >
                      {isClaiming ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        <BanknotesIcon className="h-4 w-4" />
                      )}
                      Claim All Yield
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
