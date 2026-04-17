"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  CubeIcon,
  GlobeAltIcon,
  SparklesIcon,
  Squares2X2Icon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { purchaseRWAAsset, setupTrustline } from "~~/services/stellar/stellarService";
import { notification } from "~~/utils/scaffold-eth";

const MOCK_ASSETS = [
  {
    id: 1,
    name: "Kigali Green Tower",
    ticker: "VTKGT",
    type: "Real Estate",
    icon: BuildingOffice2Icon,
    supply: "1,000,000",
    progress: 65,
    status: "Tokenized",
    apy: "11.2%",
    issuer: "GA5WUM6T7S7XFQX6QOOGQ3Q2SOGK5S2QG7Z6O7O7O7O7O7O7O7O7O7O7", // Example issuer
    price: "10", // 10 USDC per share
  },
  {
    id: 2,
    name: "Rwanda Carbon Credits",
    ticker: "VTRCC",
    type: "Carbon Credits",
    icon: SparklesIcon,
    supply: "52,000",
    progress: 42,
    status: "Active",
    apy: "8.5%",
    issuer: "GA5WUM6T7S7XFQX6QOOGQ3Q2SOGK5S2QG7Z6O7O7O7O7O7O7O7O7O7O7",
    price: "5",
  },
  {
    id: 3,
    name: "African Infrastructure Fund",
    ticker: "VTAIF",
    type: "Infrastructure",
    icon: GlobeAltIcon,
    supply: "500,000",
    progress: 18,
    status: "Pending",
    apy: "13.0%",
    issuer: "",
    price: "50",
  },
  {
    id: 4,
    name: "Gold & Tea Commodities",
    ticker: "VTGTC",
    type: "Commodities",
    icon: CubeIcon,
    supply: "250,000",
    progress: 80,
    status: "Active",
    apy: "9.8%",
    issuer: "GA5WUM6T7S7XFQX6QOOGQ3Q2SOGK5S2QG7Z6O7O7O7O7O7O7O7O7O7O7",
    price: "25",
  },
];

const STATUS_COLORS: Record<string, string> = {
  Tokenized: "badge-primary",
  Active: "badge-success",
  Pending: "badge-warning",
};

export default function MarketplacePage() {
  const { isConnected, publicKey } = useStellarWallet();
  const [loadingAssetId, setLoadingAssetId] = useState<number | null>(null);

  const handleInvest = async (asset: (typeof MOCK_ASSETS)[0]) => {
    if (!publicKey) return;
    setLoadingAssetId(asset.id);
    const notificationId = notification.loading(`Preparing investment for ${asset.name}...`);

    try {
      // Step 1: Trustline
      notification.info("Step 1/2: Establishing Trustline for Asset...", { duration: 3000 });
      await setupTrustline(publicKey, asset.ticker, asset.issuer);

      // Step 2: Purchase
      notification.info("Step 2/2: Executing USDC Exchange...", { duration: 3000 });
      await purchaseRWAAsset(publicKey, asset.ticker, asset.issuer, "1", asset.price);

      notification.remove(notificationId);
      notification.success(`Successfully invested in ${asset.name}!`);
    } catch (error: any) {
      console.error(error);
      notification.remove(notificationId);
      notification.error(`Investment failed: ${error.message || "User declined or Insufficient funds"}`);
    } finally {
      setLoadingAssetId(null);
    }
  };

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
            <span className="font-medium text-base-content/70">Native Assets</span> use Stellar Asset Protocol
            (SEP-0038/41). <span className="font-medium text-base-content/70">Hybrid Logic</span> enforced by Soroban
            contracts.
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

          {/* Stellar live notice */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 mb-8 flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
              <SparklesIcon className="h-3.5 w-3.5 text-emerald-500" />
            </span>
            <div>
              <p className="text-sm font-semibold text-emerald-400">Stellar Testnet Integration Live</p>
              <p className="text-xs text-base-content/70 mt-0.5">
                Investing now builds real Stellar transactions. Ensure you have Testnet XLM and USDC to complete the
                flow.
              </p>
            </div>
          </div>

          {/* Asset grid */}
          <div className="grid gap-5 sm:grid-cols-1">
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
                        Stellar Native Asset · Price: {asset.price} USDC / share
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <button
                      onClick={() => handleInvest(asset)}
                      className={`btn btn-primary btn-sm gap-1.5 ${loadingAssetId === asset.id ? "loading" : ""}`}
                      disabled={!isConnected || asset.status === "Pending" || loadingAssetId !== null}
                    >
                      {loadingAssetId === asset.id ? "Processing..." : "Invest"}
                      {!loadingAssetId && <ArrowRightIcon className="h-3.5 w-3.5" />}
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
            Transactions are executed on Stellar Testnet.{" "}
            <Link href="/litepaper" className="link link-primary">
              Read the tech specs
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
