"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  CubeIcon,
  GlobeAltIcon,
  InformationCircleIcon,
  ShoppingBagIcon,
  SparklesIcon,
  Squares2X2Icon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { TrustlineModal } from "~~/components/stellar/TrustlineModal";
import { fetchAsset, fetchTotalAssets, getContractIds, purchaseShares } from "~~/services/stellar/sorobanService";
import { notification } from "~~/utils/scaffold-eth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AssetStateKey = "Pending" | "Active" | "Tokenized" | "Closed" | "Relisted";
type OwnershipModelKey = "WholeOwnership" | "Fractional";

interface OnChainAsset {
  asset_id: number;
  asset_name: string;
  asset_category: string;
  asset_code: string;
  asset_owner: string;
  state: { tag: AssetStateKey };
  model: { tag: OwnershipModelKey };
  valuation: bigint;
  total_shares: bigint;
  price_per_share: bigint;
  sold_shares: bigint;
  metadata_uri: string;
  issuer: string | null;
}

const CATEGORY_ICONS: Record<string, any> = {
  "Real Estate": BuildingOffice2Icon,
  Mining: SparklesIcon,
  Agriculture: GlobeAltIcon,
  Infrastructure: CubeIcon,
  Commodities: ShoppingBagIcon,
};

function getAssetIcon(category: string) {
  return CATEGORY_ICONS[category] || CubeIcon;
}

// ---------------------------------------------------------------------------
// Marketplace Component
// ---------------------------------------------------------------------------

export default function MarketplacePage() {
  const { isConnected, publicKey } = useStellarWallet();
  const [assets, setAssets] = useState<OnChainAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<OnChainAsset | null>(null);
  const [isTrustlineModalOpen, setIsTrustlineModalOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const contracts = getContractIds();
  const isDeployed = !!contracts.registry;

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const total = await fetchTotalAssets();
      const items: OnChainAsset[] = [];
      for (let i = 1; i <= total; i++) {
        const asset = await fetchAsset(i);
        // Only show Active and Tokenized assets in marketplace
        if (asset && (asset.state.tag === "Active" || asset.state.tag === "Tokenized")) {
          items.push(asset as OnChainAsset);
        }
      }
      setAssets(items.reverse());
    } catch (e: any) {
      console.error("Failed to load assets:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isConnected && isDeployed) {
      loadAssets();
    }
  }, [isConnected, isDeployed, loadAssets]);

  const handleInvestClick = (asset: OnChainAsset) => {
    if (!publicKey) return;
    if (asset.state.tag === "Active") {
      notification.info("This asset is being tokenized. Please check back soon.");
      return;
    }
    setSelectedAsset(asset);
    setIsTrustlineModalOpen(true);
  };

  const handleInvestmentSuccess = async () => {
    if (!selectedAsset || !publicKey) return;
    setIsTrustlineModalOpen(false);
    setIsPurchasing(true);

    const notificationId = notification.loading(`Processing your purchase for ${selectedAsset.asset_name}...`);

    try {
      // For MVP we purchase 1 share
      await purchaseShares(
        {
          investor: publicKey,
          assetId: selectedAsset.asset_id,
          shareAmount: 1n,
        },
        publicKey,
      );
      notification.success(`Successfully invested in ${selectedAsset.asset_name}!`);
      await loadAssets(); // Refresh
    } catch (error: any) {
      console.error(error);
      notification.error(`Investment failed: ${error.message || "Soroban contract error"}`);
    } finally {
      setIsPurchasing(false);
      notification.remove(notificationId);
      setSelectedAsset(null);
    }
  };

  return (
    <div className="flex flex-col grow bg-base-200/20">
      <section className="px-4 py-8 md:py-12 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
            <Squares2X2Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-base-content uppercase tracking-tight">Marketplace</h1>
            <p className="text-xs text-base-content/50 uppercase tracking-widest font-semibold">
              Real-World Asset Opportunities
            </p>
          </div>
        </div>
        <p className="text-base-content/70 mb-8 max-w-2xl leading-relaxed">
          Unlock high-yield African assets through Stellar. Participate in shared ownership of commercial real estate,
          sustainable infrastructure, and industrial ventures.
        </p>

        {/* Status Alert */}
        {!isConnected ? (
          <div className="rounded-2xl border border-dashed border-base-300 p-8 text-center bg-base-100 shadow-sm mb-10">
            <WalletIcon className="h-12 w-12 text-base-content/20 mx-auto mb-3" />
            <p className="font-bold text-lg mb-1 italic">Freighter Connection Required</p>
            <p className="text-sm text-base-content/60 mb-6 max-w-sm mx-auto">
              Please connect your Stellar wallet to view and participate in RWA offerings.
            </p>
            <StellarConnectButton />
          </div>
        ) : !isDeployed ? (
          <div className="alert alert-info shadow-lg mb-10 border-blue-500/30 bg-blue-500/5">
            <InformationCircleIcon className="h-6 w-6 shrink-0" />
            <div>
              <p className="font-bold">Wait for Registry Deployment</p>
              <p className="text-sm text-base-content/70">
                The Vaultic on-chain registry is currently being synchronized.
              </p>
            </div>
          </div>
        ) : null}

        {/* Asset Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <span className="loading loading-bars loading-lg text-primary" />
            <p className="text-sm font-bold uppercase tracking-widest text-base-content/40">Fetching Ledger State...</p>
          </div>
        ) : assets.length === 0 && isConnected && isDeployed ? (
          <div className="rounded-2xl border border-dashed border-base-300 p-16 text-center bg-base-100 italic text-base-content/50">
            No active opportunities at this time.
          </div>
        ) : (
          <div className="grid gap-6">
            {assets.map(asset => {
              const Icon = getAssetIcon(asset.asset_category);
              const progress =
                asset.total_shares > 0n
                  ? Math.round((Number(asset.sold_shares) / Number(asset.total_shares)) * 100)
                  : 0;
              const isTokenized = asset.state.tag === "Tokenized";

              return (
                <div
                  key={asset.asset_id}
                  className="rounded-3xl border border-base-300 bg-base-100 p-6 md:p-8 shadow-sm hover:border-primary/40 hover:shadow-md transition-all group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-start gap-6">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/5 text-primary border border-primary/10 shadow-inner group-hover:bg-primary/10 transition-colors">
                        <Icon className="h-9 w-9" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-xl text-base-content">{asset.asset_name}</h3>
                          <span
                            className={`badge badge-sm font-bold uppercase tracking-tighter ${
                              isTokenized ? "badge-primary" : "badge-success"
                            }`}
                          >
                            {asset.state.tag}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-base-content/50 font-medium">
                          <span className="flex items-center gap-1">
                            <CubeIcon className="h-3 w-3" /> {asset.asset_category}
                          </span>
                          <span className="text-primary font-mono bg-primary/5 px-1.5 rounded">{asset.asset_code}</span>
                          <span>ID: #{asset.asset_id}</span>
                        </div>

                        {isTokenized ? (
                          <div className="mt-4 flex items-center gap-4">
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-base-content/40 font-bold">
                                Price / Share
                              </p>
                              <p className="text-lg font-bold text-primary">
                                {(Number(asset.price_per_share) / 1e7).toFixed(2)} USDC
                              </p>
                            </div>
                            <div className="h-8 w-px bg-base-300" />
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-base-content/40 font-bold">
                                Supply
                              </p>
                              <p className="text-lg font-bold text-base-content">{asset.total_shares.toString()}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4">
                            <p className="text-sm font-bold text-success/70 italic uppercase tracking-widest">
                              Registry Approved · Tokenization in progress
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      <button
                        onClick={() => handleInvestClick(asset)}
                        disabled={!isConnected || asset.state.tag === "Active" || isPurchasing}
                        className={`btn btn-primary btn-lg rounded-2xl px-10 gap-3 shadow-lg shadow-primary/20 ${
                          isPurchasing && selectedAsset?.asset_id === asset.asset_id ? "loading" : ""
                        }`}
                      >
                        {isPurchasing && selectedAsset?.asset_id === asset.asset_id ? "Investing..." : "Invest Now"}
                        {!isPurchasing && <ArrowRightIcon className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {isTokenized && (
                    <div className="mt-8 pt-8 border-t border-base-200">
                      <div className="flex justify-between items-end mb-2.5">
                        <span className="text-xs font-bold text-base-content/40 uppercase tracking-widest">
                          Funding Progress
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-base-content/70">
                            {asset.sold_shares.toString()} / {asset.total_shares.toString()} SOLD
                          </span>
                          <span className="text-sm font-bold text-primary">{progress}%</span>
                        </div>
                      </div>
                      <div className="h-3 w-full bg-base-200 rounded-full overflow-hidden shadow-inner border border-base-300/50 p-0.5">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-lg"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-16 text-center">
          <p className="text-xs text-base-content/30 uppercase tracking-[0.2em] font-bold">
            Vaultic Trust · Institutional Grade African RWAs · Stellar Consensus
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
          assetCode={selectedAsset.asset_code}
          issuer={selectedAsset.issuer || ""}
          onSuccess={handleInvestmentSuccess}
        />
      )}
    </div>
  );
}
