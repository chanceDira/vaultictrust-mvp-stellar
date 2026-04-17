"use client";

import { useState } from "react";
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
import { TrustlineModal } from "~~/components/stellar/TrustlineModal";
import { purchaseRWAAsset } from "~~/services/stellar/stellarService";
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
    issuer: "GA5WUM6T7S7XFQX6QOOGQ3Q2SOGK5S2QG7Z6O7O7O7O7O7O7O7O7O7O7",
    price: "10",
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
  const [selectedAsset, setSelectedAsset] = useState<(typeof MOCK_ASSETS)[0] | null>(null);
  const [isTrustlineModalOpen, setIsTrustlineModalOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handleInvestClick = (asset: (typeof MOCK_ASSETS)[0]) => {
    if (!publicKey) return;
    setSelectedAsset(asset);
    setIsTrustlineModalOpen(true);
  };

  const handleTrustlineSuccess = async () => {
    if (!selectedAsset || !publicKey) return;
    setIsTrustlineModalOpen(false);
    setIsPurchasing(true);

    const notificationId = notification.loading(`Processing your purchase of ${selectedAsset.name}...`);

    try {
      await purchaseRWAAsset(
        publicKey,
        selectedAsset.ticker,
        selectedAsset.issuer,
        "1", // 1 share for MVP
        selectedAsset.price,
      );
      notification.success(`Purchase successful! Your fractional shares of ${selectedAsset.name} are on-chain.`);
    } catch (error: any) {
      console.error(error);
      notification.error(`Purchase failed: ${error.message || "Stellar network error"}`);
    } finally {
      setIsPurchasing(false);
      notification.remove(notificationId);
      setSelectedAsset(null);
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
            <h1 className="text-3xl font-bold text-base-content uppercase tracking-tight">Marketplace</h1>
          </div>
          <p className="text-base-content/80 mb-2">
            Browse tokenized real-world assets on Stellar Network. Invest in whole assets or buy fractional shares.
          </p>
          <p className="text-sm text-base-content/60 mb-6 uppercase tracking-widest font-medium">
            Africa&apos;s RWA <span className="text-primary">Stellar</span> Gateway
          </p>

          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 mb-8 flex items-start gap-4 shadow-sm">
            <SparklesIcon className="h-6 w-6 text-primary shrink-0" />
            <div>
              <p className="text-sm font-bold text-base-content">Stellar Hybrid Model Active</p>
              <p className="text-xs text-base-content/70 mt-1">
                Native Stellar Assets provide instant liquidity. Soroban Smart Contracts enforce African regulatory
                compliance.
              </p>
            </div>
          </div>

          {!isConnected && (
            <div className="rounded-2xl border border-dashed border-base-300 p-6 mb-8 text-center bg-base-100">
              <WalletIcon className="h-10 w-10 text-base-content/20 mx-auto mb-3" />
              <p className="text-base-content font-bold mb-1">Sign in with Freighter</p>
              <p className="text-sm text-base-content/60 mb-6">
                You need to connect a Stellar wallet to begin investing in RWAs.
              </p>
              <StellarConnectButton />
            </div>
          )}

          {/* Asset grid */}
          <div className="grid gap-5">
            {MOCK_ASSETS.map(asset => (
              <div
                key={asset.id}
                className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm hover:border-primary/25 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-5">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <asset.icon className="h-7 w-7" />
                    </span>
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-lg text-base-content">{asset.name}</p>
                        <span className={`badge badge-sm font-semibold ${STATUS_COLORS[asset.status]}`}>
                          {asset.status}
                        </span>
                      </div>
                      <p className="text-xs text-base-content/60 mt-1 uppercase tracking-wider font-mono">
                        {asset.ticker} · {asset.type} · Supply: {asset.supply}
                      </p>
                      <p className="text-xs text-primary font-bold mt-2 uppercase tracking-widest">
                        {asset.price} USDC / SHARE · EST. APY {asset.apy}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 flex gap-2">
                    <button
                      onClick={() => handleInvestClick(asset)}
                      disabled={!isConnected || asset.status === "Pending" || isPurchasing}
                      className={`btn btn-primary btn-md gap-2 ${isPurchasing && selectedAsset?.id === asset.id ? "loading" : ""}`}
                    >
                      {isPurchasing && selectedAsset?.id === asset.id ? "Purchasing..." : "Invest Now"}
                      {!isPurchasing && <ArrowRightIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {/* Progress */}
                <div className="mt-6 pt-6 border-t border-base-200">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-bold text-base-content/50 uppercase tracking-widest">
                      Round Progress
                    </span>
                    <span className="text-xs font-bold text-primary">{asset.progress}% Funded</span>
                  </div>
                  <div className="h-2.5 w-full bg-base-200 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${asset.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-xs text-base-content/40 text-center uppercase tracking-widest">
            Vaultic Trust · African RWA Liquidity Gateway · Powered by Stellar
          </p>
        </div>
      </section>

      {/* Trustline and Purchase Guard */}
      {selectedAsset && (
        <TrustlineModal
          isOpen={isTrustlineModalOpen}
          onClose={() => {
            setIsTrustlineModalOpen(false);
            setSelectedAsset(null);
          }}
          publicKey={publicKey || ""}
          assetCode={selectedAsset.ticker}
          issuer={selectedAsset.issuer}
          onSuccess={handleTrustlineSuccess}
        />
      )}
    </div>
  );
}
