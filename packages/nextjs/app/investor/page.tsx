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
import { PROTOCOL_METADATA } from "~~/scaffold.config";
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

interface YieldInfo {
  assetId: number;
  assetCode: string;
  claimable: bigint;
}

interface EnrichedHolding {
  assetId: number;
  assetCode: string;
  assetIssuer: string;
  balance: number;
  price: number;
  value: number;
  ownershipPercent: number;
  totalShares: number;
}

export default function InvestorPage() {
  const { isConnected, publicKey } = useStellarWallet();
  const { holdings, isLoading: isHoldingsLoading } = useStellarHoldings(publicKey);
  const [assetMapping, setAssetMapping] = useState<Record<string, any>>({});
  const [enrichedHoldings, setEnrichedHoldings] = useState<EnrichedHolding[]>([]);
  const [yields, setYields] = useState<YieldInfo[]>([]);
  const [isYieldLoading, setIsYieldLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [kycRecord, setKycRecord] = useState<any>(null);
  const [isKycLoading, setIsKycLoading] = useState(false);

  const contracts = getContractIds();
  const isDeployed = !!contracts.registry;

  const loadAssetMapping = useCallback(async () => {
    if (!isDeployed) return;
    try {
      const total = await fetchTotalAssets();
      const mapping: Record<string, any> = {};
      for (let i = 1; i <= total; i++) {
        const asset = await fetchAsset(i);
        if (asset) {
          mapping[asset.asset_code] = asset;
        }
      }
      setAssetMapping(mapping);
    } catch (e) {
      console.error("Mapping fetch failed:", e);
    }
  }, [isDeployed]);

  const enrichHoldings = useCallback(() => {
    if (Object.keys(assetMapping).length === 0 || holdings.length === 0) {
      setEnrichedHoldings([]);
      return;
    }

    const enriched = holdings
      .map(h => {
        const asset = assetMapping[h.asset_code];
        if (!asset) return null;

        const balance = Number.parseFloat(h.balance);
        if (balance <= 0) return null;

        const price = Number(asset.price_per_share) / 1e7;
        const totalShares = Number(asset.total_shares);
        const value = balance * price;
        const ownershipPercent = totalShares > 0 ? (balance / totalShares) * 100 : 0;

        return {
          assetId: asset.asset_id,
          assetCode: h.asset_code,
          assetIssuer: h.asset_issuer,
          balance,
          price,
          value,
          ownershipPercent,
          totalShares,
        };
      })
      .filter((h): h is EnrichedHolding => h !== null);

    setEnrichedHoldings(enriched);
  }, [holdings, assetMapping]);

  const loadYields = useCallback(async () => {
    if (!publicKey || enrichedHoldings.length === 0) return;
    setIsYieldLoading(true);
    try {
      const yieldResults: YieldInfo[] = [];
      for (const holding of enrichedHoldings) {
        const claimable = await fetchClaimableYield(holding.assetId, publicKey);
        if (claimable > 0n) {
          yieldResults.push({
            assetId: holding.assetId,
            assetCode: holding.assetCode,
            claimable,
          });
        }
      }
      setYields(yieldResults);
    } catch (e) {
      console.error("Yield fetch failed:", e);
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
    loadAssetMapping();
    loadKyc();
  }, [loadAssetMapping, loadKyc]);

  useEffect(() => {
    enrichHoldings();
  }, [enrichHoldings]);

  useEffect(() => {
    loadYields();
  }, [loadYields]);

  const handleClaimYield = async (assetId: number, assetCode: string) => {
    if (!publicKey) return;
    setIsClaiming(true);
    const notifId = notification.loading(`Claiming yield for ${assetCode}...`);
    try {
      const { hash } = await claimAllYield(assetId, publicKey);
      notification.success(
        <div className="flex flex-col gap-1">
          <p className="font-bold">Yield claimed!</p>
          <a
            href={PROTOCOL_METADATA.EXPLORER_TX_URL(hash)}
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
      notification.remove(notifId);
    }
  };

  return (
    <div className="flex flex-col grow min-h-screen">
      <section className="px-4 py-8 md:py-12 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
            <ChartBarIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black text-base-content uppercase tracking-tighter">Investment Portfolio</h1>
              {isConnected && !isKycLoading && (
                <KycStatusBadge
                  status={typeof kycRecord?.status === "string" ? kycRecord.status : kycRecord?.status?.tag}
                />
              )}
            </div>
            <p className="text-[10px] text-base-content/40 uppercase tracking-[0.2em] font-bold">
              Manage Holdings & Claim Yield
            </p>
          </div>
        </div>
        <p className="text-base-content/70 mb-8 max-w-2xl leading-relaxed">
          Track your fractional real-world asset positions and manage automated yield distributions. Your dashboard for
          liquidity in the African real economy.
        </p>

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-3xl border border-base-300 bg-base-100/40 backdrop-blur-md p-6 shadow-2xl shadow-primary/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2 text-base-content/40 mb-2">
                  <CubeIcon className="h-4 w-4" />
                  <span className="text-[10px] uppercase tracking-[0.2em] font-black">Total Assets Held</span>
                </div>
                <p className="text-5xl font-black italic text-base-content leading-none">{enrichedHoldings.length}</p>
                <p className="text-[9px] text-primary font-black uppercase tracking-widest mt-2">Verified on Ledger</p>
              </div>

              <div className="rounded-3xl border border-base-300 bg-gradient-to-br from-base-100/80 to-base-100/40 backdrop-blur-md p-6 shadow-2xl col-span-1 md:col-span-2 flex flex-col justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-base-content/40">
                    <BanknotesIcon className="h-4 w-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black">Portfolio Valuation</span>
                  </div>
                  {isYieldLoading && <span className="loading loading-spinner loading-xs text-primary" />}
                </div>
                <div className="flex items-end justify-between mt-3">
                  <p className="text-4xl font-black text-success italic leading-none">
                    {enrichedHoldings
                      .reduce((acc, curr) => acc + curr.value, 0)
                      .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                    <span className="text-xs font-bold opacity-60 not-italic tracking-widest">USDC</span>
                  </p>
                  <p className="text-[10px] text-base-content/30 font-mono tracking-tighter">
                    {shortenStellarAddress(publicKey || "")}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-base-content/40 flex items-center gap-2">
                  <CheckBadgeIcon className="h-4 w-4" /> Your Active Positions
                </h3>

                {isHoldingsLoading ? (
                  <div className="py-12 text-center">
                    <span className="loading loading-dots loading-md text-primary" />
                  </div>
                ) : enrichedHoldings.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-base-300 p-12 text-center bg-base-100/50">
                    <p className="text-sm text-base-content/40 italic">You don&apos;t hold any Vaultic assets yet.</p>
                    <Link href="/marketplace" className="btn btn-primary btn-sm mt-4 gap-2">
                      Explore Marketplace
                      <ArrowRightIcon className="h-3 w-3" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {enrichedHoldings.map(holding => (
                      <div
                        key={holding.assetCode}
                        className="rounded-2xl border border-base-300 bg-base-100/60 backdrop-blur-sm p-5 hover:border-primary/50 transition-all flex items-center justify-between shadow-sm hover:shadow-xl hover:shadow-primary/5 group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 shadow-inner group-hover:scale-110 transition-transform">
                            <CubeIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-base-content">{holding.assetCode}</p>
                              <span className="px-1.5 py-0.5 rounded bg-base-200 text-[8px] font-bold opacity-60 uppercase tracking-tighter">
                                {holding.ownershipPercent.toFixed(4)}% Share
                              </span>
                            </div>
                            <p className="text-[10px] text-base-content/40 font-mono">
                              Issuer: {shortenStellarAddress(holding.assetIssuer, 6)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] uppercase font-bold tracking-widest opacity-30 mb-0.5">Price</p>
                            <p className="text-xs font-mono font-bold">${holding.price.toFixed(2)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-base-content">
                              {holding.balance.toLocaleString()}{" "}
                              <span className="text-[10px] uppercase font-normal opacity-40 tracking-widest">
                                Shares
                              </span>
                            </p>
                            <p className="text-xs font-black text-primary">
                              $
                              {holding.value.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              <span className="text-[8px] opacity-60">USDC</span>
                            </p>
                            <a
                              href={`https://stellar.expert/explorer/testnet/asset/${holding.assetCode}-${holding.assetIssuer}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9px] text-primary hover:underline flex items-center justify-end gap-1 mt-1 opacity-60"
                            >
                              Details <ArrowTopRightOnSquareIcon className="h-2 w-2" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
                      className="btn btn-primary btn-md w-full gap-2 rounded-2xl shadow-lg shadow-primary/20 stellar-glow font-black uppercase tracking-widest"
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
                        <BanknotesIcon className="h-5 w-5" />
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
