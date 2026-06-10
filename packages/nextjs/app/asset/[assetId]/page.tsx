"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeftIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  CheckBadgeIcon,
  CubeIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  TagIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { BuySharesModal } from "~~/components/modals/BuySharesModal";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { TrustlineModal } from "~~/components/stellar/TrustlineModal";
import { PageLoading } from "~~/components/ui/PageLoading";
import { PageStatus } from "~~/components/ui/PageStatus";
import { fetchAsset, fetchYieldRoundCount } from "~~/services/stellar/sorobanService";
import { OnChainAsset } from "~~/types/stellar";
import { notification } from "~~/utils/vaultic";

export default function AssetDetailsPage() {
  const { assetId } = useParams();
  const { publicKey } = useStellarWallet();

  const [asset, setAsset] = useState<OnChainAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [yieldRoundCount, setYieldRoundCount] = useState(0);

  const [isTrustlineOpen, setIsTrustlineOpen] = useState(false);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!assetId) return;
    setLoading(true);
    setLoadError(false);
    try {
      const id = parseInt(assetId as string, 10);
      if (Number.isNaN(id) || id < 0) {
        setAsset(null);
        return;
      }
      const data = await fetchAsset(id);
      if (data) {
        setAsset(data);
        const rounds = await fetchYieldRoundCount(id);
        setYieldRoundCount(rounds);
      } else {
        setAsset(null);
      }
    } catch (e) {
      console.error("[AssetDetails] Load error:", e);
      setLoadError(true);
      notification.error("Failed to load asset details");
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <PageLoading label="Loading asset" />;
  }

  if (loadError) {
    return (
      <PageStatus
        variant="error"
        title="Could not load asset"
        description="We could not fetch this asset from the network. Check your connection and try again."
        onRetry={loadData}
        actions={[
          { label: "Marketplace", href: "/marketplace", primary: true },
          { label: "Go home", href: "/" },
        ]}
      />
    );
  }

  if (!asset) {
    return (
      <PageStatus
        code="404"
        variant="404"
        title="Asset not found"
        description="This asset does not exist on Vaultic Trust or may have been removed."
        actions={[
          { label: "Marketplace", href: "/marketplace", primary: true },
          { label: "Go home", href: "/" },
        ]}
      />
    );
  }

  const soldPercentage = asset.total_shares > 0n ? Number((asset.sold_shares * 100n) / asset.total_shares) : 0;
  const valuationUsdc = Number(asset.valuation) / 1e7;
  const pricePerShare = Number(asset.price_per_share) / 1e7;

  return (
    <div className="flex flex-col grow pb-20">
      <section className="bg-base-200/50 border-b border-base-300 relative overflow-hidden">
        <div className="relative z-10 mx-auto max-w-7xl px-3 py-12 sm:px-4 md:py-16">
          <Link
            href="/marketplace"
            className="btn btn-ghost btn-sm gap-2 mb-8 -ml-2 rounded-xl text-xs uppercase tracking-widest font-bold opacity-50 hover:opacity-100 transition-opacity"
          >
            <ArrowLeftIcon className="h-3 w-3" />
            Back to Marketplace
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-xl shadow-primary/5">
                  <BuildingOffice2Icon className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h1 className="page-title text-4xl leading-tight sm:text-5xl">{asset.asset_name}</h1>
                  <p className="mt-2 text-sm text-base-content/60">
                    {asset.asset_code} · {asset.asset_category}
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-base-content/60">
                Tokenized {asset.asset_category.toLowerCase()} asset on Stellar. Shares are issued as native assets
                after admin review and KYC checks.
              </p>
            </div>

            <div className="bg-base-100 border border-base-300 p-8 rounded-[2.5rem] shadow-2xl shadow-primary/5 min-w-[280px]">
              <p className="text-[10px] text-base-content/40 uppercase tracking-widest font-black mb-1">
                Asset Valuation
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black italic text-base-content">${valuationUsdc.toLocaleString()}</span>
                <span className="text-sm font-bold text-base-content/40 uppercase">USDC</span>
              </div>
              <div className="h-px bg-base-300 my-4" />
              <div className="flex justify-between items-center text-xs">
                <span className="opacity-40 uppercase font-black tracking-widest">Share Price</span>
                <span className="font-mono font-bold">${pricePerShare.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent skew-x-[-20deg] translate-x-1/4" />
      </section>

      <section className="mx-auto w-full max-w-7xl px-3 py-12 sm:px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-base-200/30 border border-base-300 rounded-[2rem] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ChartBarIcon className="h-5 w-5 text-primary opacity-50" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Funding Progress</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-2xl font-black italic">{soldPercentage}%</span>
                    <span className="text-[10px] uppercase font-bold opacity-30">
                      {Number(asset.sold_shares).toLocaleString()} / {Number(asset.total_shares).toLocaleString()}{" "}
                      Shares
                    </span>
                  </div>
                  <progress
                    className="progress progress-primary w-full h-3 rounded-full"
                    value={soldPercentage}
                    max="100"
                  ></progress>
                </div>
              </div>

              <div className="bg-base-200/30 border border-base-300 rounded-[2rem] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <BanknotesIcon className="h-5 w-5 text-success opacity-50" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Yield Performance</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-black italic">{yieldRoundCount}</span>
                    <span className="text-[10px] uppercase font-bold opacity-30">Payout Rounds Completed</span>
                  </div>
                  <p className="text-[9px] text-success font-bold uppercase tracking-widest bg-success/10 px-2 py-1 rounded-md inline-block">
                    Operational & Yielding
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-black uppercase tracking-[0.3em] opacity-40 border-l-2 border-primary pl-4">
                Protocol Metadata
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 bg-base-100 border border-base-300 p-8 rounded-[2.5rem]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-primary opacity-50">
                    <TagIcon className="h-4 w-4" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Asset ID</span>
                  </div>
                  <p className="font-mono text-sm font-bold">#{asset.asset_id}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-primary opacity-50">
                    <CubeIcon className="h-4 w-4" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Stellar Asset</span>
                  </div>
                  <p className="font-mono text-sm font-bold">{asset.asset_code}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-primary opacity-50">
                    <UserIcon className="h-4 w-4" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Asset Owner</span>
                  </div>
                  <p className="font-mono text-xs font-bold break-all opacity-60 underline decoration-primary/20">
                    {asset.asset_owner}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-primary opacity-50">
                    <CheckBadgeIcon className="h-4 w-4" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Model</span>
                  </div>
                  <p className="font-bold text-sm italic uppercase tracking-tighter">{asset.model.tag}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8 bg-primary/5 border border-primary/10 p-10 rounded-[2.5rem]">
              <div className="h-16 w-16 bg-base-100 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-xl shrink-0">
                <ShieldCheckIcon className="h-8 w-8" />
              </div>
              <div>
                <h4 className="mb-1 text-xl font-semibold">On-chain compliance</h4>
                <p className="max-w-lg text-xs leading-relaxed text-base-content/50">
                  This asset uses Vaultic contracts for KYC checks and dividend distribution. Only verified investors
                  can hold shares.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="sticky top-24">
              <div className="bg-base-100 border border-base-300 rounded-[2.5rem] p-8 shadow-2xl shadow-primary/10 space-y-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />

                <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-4 relative z-10">
                  Market Access
                </h3>

                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between text-xs font-bold opacity-30 uppercase tracking-widest">
                    <span>Total Supply</span>
                    <span>{Number(asset.total_shares).toLocaleString()} SHARES</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-primary uppercase tracking-widest">
                    <span>Available</span>
                    <span>{Number(asset.total_shares - asset.sold_shares).toLocaleString()} SHARES</span>
                  </div>
                </div>

                <div className="h-px bg-base-200" />

                <div className="space-y-3 relative z-10">
                  <button
                    className="btn btn-primary btn-lg w-full rounded-2xl gap-3 stellar-glow font-black uppercase tracking-widest text-xs"
                    onClick={() =>
                      asset.model.tag === "Fractional" ? setIsTrustlineOpen(true) : setIsBuyModalOpen(true)
                    }
                    disabled={asset.total_shares - asset.sold_shares <= 0n}
                  >
                    Invest in {asset.asset_code}
                    <BanknotesIcon className="h-5 w-5" />
                  </button>
                  <p className="text-[10px] text-center text-base-content/30 font-bold uppercase tracking-widest">
                    Secured by Stellar Network
                  </p>
                </div>

                <div className="bg-base-200/50 p-6 rounded-2xl border border-base-300 flex items-start gap-3">
                  <DocumentTextIcon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <h5 className="text-[10px] font-black uppercase tracking-widest mb-1">RWA Offering</h5>
                    <p className="text-[9px] leading-relaxed opacity-60">
                      Investments carry risk. By proceeding, you acknowledge familiarity with the underlying{" "}
                      {asset.asset_category.toLowerCase()} asset and domestic regulations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TrustlineModal
        isOpen={isTrustlineOpen}
        onClose={() => setIsTrustlineOpen(false)}
        publicKey={publicKey ?? ""}
        assetCode={asset.asset_code}
        issuer={asset.issuer ?? ""}
        onSuccess={() => {
          setIsTrustlineOpen(false);
          setIsBuyModalOpen(true);
        }}
      />

      <BuySharesModal
        isOpen={isBuyModalOpen}
        onClose={() => setIsBuyModalOpen(false)}
        asset={asset}
        publicKey={publicKey ?? ""}
        onSuccess={() => {
          setIsBuyModalOpen(false);
          loadData();
        }}
      />
    </div>
  );
}
