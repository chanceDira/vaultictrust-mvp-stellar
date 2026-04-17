"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  CubeIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  MapPinIcon,
  SparklesIcon,
  Squares2X2Icon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";

const MOCK_ASSETS = [
  {
    id: 1,
    name: "Kigali Green Tower",
    ticker: "VT-KGT",
    type: "Real Estate",
    icon: BuildingOffice2Icon,
    supply: "1,000,000",
    progress: 65,
    status: "Tokenized",
    apy: "11.2%",
  },
  {
    id: 2,
    name: "Rwanda Carbon Credits",
    ticker: "VT-RCC",
    type: "Carbon Credits",
    icon: SparklesIcon,
    supply: "52,000",
    progress: 42,
    status: "Active",
    apy: "8.5%",
  },
  {
    id: 3,
    name: "African Infrastructure Fund",
    ticker: "VT-AIF",
    type: "Infrastructure",
    icon: GlobeAltIcon,
    supply: "500,000",
    progress: 18,
    status: "Pending",
    apy: "13.0%",
  },
  {
    id: 4,
    name: "Gold & Tea Commodities",
    ticker: "VT-GTC",
    type: "Commodities",
    icon: CubeIcon,
    supply: "250,000",
    progress: 80,
    status: "Active",
    apy: "9.8%",
  },
  {
    id: 5,
    name: "Kenya T-Bills",
    ticker: "VT-KTB",
    type: "Treasury Bills",
    icon: CurrencyDollarIcon,
    supply: "100,000",
    progress: 55,
    status: "Active",
    apy: "12.0%",
  },
  {
    id: 6,
    name: "DePIN Location Nodes",
    ticker: "VT-DPN",
    type: "DePIN",
    icon: MapPinIcon,
    supply: "200,000",
    progress: 30,
    status: "Pending",
    apy: "15.5%",
  },
];

const STATUS_COLORS: Record<string, string> = {
  Tokenized: "badge-primary",
  Active: "badge-success",
  Pending: "badge-warning",
};

export default function MarketplacePage() {
  const { isConnected } = useStellarWallet();

  return (
    <div className="flex flex-col grow">
      <section className="px-4 py-8 md:py-12">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Squares2X2Icon className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-base-content">Marketplace</h1>
          </div>
          <p className="text-base-content/80 mb-2">
            Browse tokenized real-world assets on Stellar Network. Invest in whole assets or buy fractional shares.
          </p>
          <p className="text-sm text-base-content/60 mb-6">
            <span className="font-medium text-base-content/70">Tokenized</span> assets use Stellar Asset Contracts
            (SAC/SEP-0041).{" "}
            <span className="font-medium text-base-content/70">Active</span> assets accept whole-asset investment.{" "}
            <span className="font-medium text-base-content/70">Pending</span> assets are under review.
          </p>

          {/* Wallet connect prompt */}
          {!isConnected && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <WalletIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-base-content">Connect Freighter to invest</p>
                  <p className="text-sm text-base-content/70">
                    Browse assets freely. Connect your Stellar wallet to purchase shares.
                  </p>
                </div>
              </div>
              <StellarConnectButton />
            </div>
          )}

          {/* Stellar upgrade notice */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-8 flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <svg className="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-base-content">Stellar Smart Contracts Coming Soon</p>
              <p className="text-xs text-base-content/70 mt-0.5">
                Soroban contracts are being deployed in Phase 2. Asset data shown below is a preview of listed RWAs.
                Live on-chain investment will be enabled upon contract deployment.
              </p>
            </div>
          </div>

          {/* Asset grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            {MOCK_ASSETS.map(asset => (
              <div
                key={asset.id}
                className="rounded-2xl border border-base-300/80 bg-base-100 p-5 sm:p-6 shadow-sm hover:border-primary/25 hover:shadow-md transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <asset.icon className="h-6 w-6" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-base-content">{asset.name}</p>
                        <span className={`badge badge-sm ${STATUS_COLORS[asset.status]}`}>{asset.status}</span>
                      </div>
                      <p className="text-xs text-base-content/60 mt-0.5">
                        {asset.ticker} · {asset.type} · Supply: {asset.supply} tokens
                      </p>
                      <p className="text-xs text-primary/80 font-medium mt-1">
                        SEP-0041 · Stellar Asset Contract · Est. APY: {asset.apy}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <button
                      className="btn btn-primary btn-sm gap-1.5"
                      disabled={!isConnected || asset.status === "Pending"}
                      title={
                        !isConnected
                          ? "Connect Freighter wallet"
                          : asset.status === "Pending"
                          ? "Asset pending review"
                          : "Invest"
                      }
                    >
                      Invest
                      <ArrowRightIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs font-medium text-base-content/60">
                    <span>Funding progress</span>
                    <span>{asset.progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-base-300/80">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-500"
                      style={{ width: `${asset.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-base-content/50 text-center">
            Asset data is illustrative pending Soroban contract deployment.{" "}
            <Link href="/litepaper" className="link link-primary">
              Read the litepaper
            </Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
