"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  ClockIcon,
  CubeIcon,
  ExclamationCircleIcon,
  GlobeAltIcon,
  IdentificationIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SparklesIcon,
  Squares2X2Icon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { TrustlineModal } from "~~/components/stellar/TrustlineModal";
import {
  fetchAsset,
  fetchTotalAssets,
  fetchUserRecord,
  getContractIds,
  purchaseShares,
  submitKyc,
} from "~~/services/stellar/sorobanService";
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

  // KYC State
  const [kycRecord, setKycRecord] = useState<any>(null);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false);

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

  const loadKyc = useCallback(async () => {
    if (!publicKey || !isDeployed) return;
    try {
      const record = await fetchUserRecord(publicKey);
      setKycRecord(record);
    } catch (e) {
      console.error("KYC load error", e);
    }
  }, [publicKey, isDeployed]);

  useEffect(() => {
    if (isConnected && isDeployed) {
      loadAssets();
      loadKyc();
    } else {
      setKycRecord(null);
    }
  }, [isConnected, isDeployed, loadAssets, loadKyc]);

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

  const handleSubmitKyc = async () => {
    if (!publicKey) return;
    setIsSubmittingKyc(true);
    const id = notification.loading("Submitting identity hash for verification...");
    try {
      // Mocked metadata URI for MVP (in prod, this is a CID with encrypted PII)
      const mockCid = `ipfs://kyc-${publicKey.slice(0, 8)}-${Date.now()}`;
      await submitKyc(mockCid, publicKey);
      notification.success("KYC application submitted! Please wait for admin approval.");
      setIsKycModalOpen(false);
      await loadKyc();
    } catch (e: any) {
      notification.error(`Submission failed: ${e.message}`);
    } finally {
      setIsSubmittingKyc(false);
      notification.remove(id);
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
        ) : kycRecord?.status === 0 || kycRecord?.status === 1 || kycRecord?.status === 3 || kycRecord?.status === 4 ? (
          <div
            className={`alert mb-10 shadow-lg border animate-in fade-in slide-in-from-top-4 ${
              kycRecord.status === 2
                ? "alert-success bg-emerald-500/5 border-emerald-500/30"
                : kycRecord.status === 1
                  ? "alert-warning bg-yellow-500/5 border-yellow-500/30"
                  : "alert-error bg-red-500/5 border-red-500/30"
            }`}
          >
            {kycRecord.status === 1 ? (
              <ClockIcon className="h-6 w-6 text-yellow-500" />
            ) : (
              <ExclamationCircleIcon className="h-6 w-6" />
            )}
            <div className="flex-1">
              <p className="font-bold">
                {kycRecord.status === 1
                  ? "Verification Pending"
                  : kycRecord.status === 3
                    ? "Verification Rejected"
                    : kycRecord.status === 4
                      ? "Account Suspended"
                      : "Identity Verification Required"}
              </p>
              <p className="text-sm text-base-content/70">
                {kycRecord.status === 1
                  ? "Your KYC application is being reviewed by the Vaultic compliance team."
                  : kycRecord.status === 3
                    ? "Your application was rejected. Please contact support or resubmit."
                    : kycRecord.status === 4
                      ? "Your account has been suspended for compliance reasons."
                      : "To participate in RWA tokenization, you must first complete your identity verification."}
              </p>
            </div>
            {kycRecord.status === 0 && (
              <button className="btn btn-primary btn-sm" onClick={() => setIsKycModalOpen(true)}>
                Verify Identity
              </button>
            )}
          </div>
        ) : kycRecord?.status === 2 ? (
          <div className="flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 w-fit">
            <ShieldCheckIcon className="h-4 w-4 text-emerald-500" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-500">
              Verified Investor Profile
            </span>
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
                        disabled={
                          !isConnected || asset.state.tag === "Active" || isPurchasing || kycRecord?.status !== 2
                        }
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

      {/* KYC Modal */}
      {isKycModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-base-100 border border-base-300 rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6">
              <IdentificationIcon className="h-9 w-9" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Complete KYC</h2>
            <p className="text-base-content/60 text-sm mb-8 leading-relaxed">
              To comply with financial regulations, we require a one-time identity verification. Your data remains
              private — only a cryptographic proof is stored on-chain.
            </p>

            <div className="space-y-4 mb-8">
              <div className="p-4 rounded-xl bg-base-200 border border-base-300 text-xs text-base-content/50 italic">
                For the MVP, this will submit a hashed identity record to the Vaultic compliance oracle.
              </div>
            </div>

            <div className="flex gap-3">
              <button className="btn btn-ghost flex-1" onClick={() => setIsKycModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary flex-1 shadow-lg shadow-primary/20"
                onClick={handleSubmitKyc}
                disabled={isSubmittingKyc}
              >
                {isSubmittingKyc ? <span className="loading loading-spinner" /> : "Verify Identity"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
