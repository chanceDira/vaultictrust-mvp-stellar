"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRightIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { AssetCard } from "~~/components/marketplace/AssetCard";
import { KycStatusBanner } from "~~/components/marketplace/KycStatusBanner";
import {
  MarketplaceHeader,
  MarketplaceLoading,
  WalletPreparationBanner,
} from "~~/components/marketplace/MarketplaceLayout";
import { BuySharesModal } from "~~/components/modals/BuySharesModal";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { TrustlineModal } from "~~/components/stellar/TrustlineModal";
import { getExplorerTxUrl } from "~~/scaffold.config";
import {
  fetchAsset,
  fetchTotalAssets,
  fetchUsdcTrustlineStatus,
  fetchUserRecord,
  getContractIds,
  purchaseWholeAsset,
} from "~~/services/stellar/sorobanService";
import { OnChainAsset } from "~~/types/stellar";
import { notification } from "~~/utils/scaffold-eth";

export default function MarketplacePage() {
  const { isConnected, publicKey, connect } = useStellarWallet();
  const [assets, setAssets] = useState<OnChainAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<OnChainAsset | null>(null);
  const [isTrustlineModalOpen, setIsTrustlineModalOpen] = useState(false);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const [kycRecord, setKycRecord] = useState<any>(null);
  const [usdcStatus, setUsdcStatus] = useState<{
    hasTrustline: boolean;
    isAuthorized: boolean;
    balance: string;
  } | null>(null);

  const stats = {
    totalAssets: assets.length,
    tvl: assets
      .reduce((acc, curr) => acc + Number(curr.valuation || 0n) / 1e7, 0)
      .toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  };

  const contracts = getContractIds();
  const isDeployed = !!contracts.registry;

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const total = await fetchTotalAssets();
      const indices = Array.from({ length: total }, (_, i) => i + 1);

      const results = await Promise.all(
        indices.map(async i => {
          const asset = await fetchAsset(i);
          if (asset && (asset.state.tag === "Active" || asset.state.tag === "Tokenized")) {
            return asset as OnChainAsset;
          }
          return null;
        }),
      );

      const activeAssets = results.filter((asset): asset is OnChainAsset => asset !== null);
      setAssets(activeAssets.reverse());
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

  const checkUsdc = useCallback(async () => {
    if (!publicKey) return;
    const status = await fetchUsdcTrustlineStatus(publicKey);
    setUsdcStatus(status);
  }, [publicKey]);

  useEffect(() => {
    if (isDeployed) {
      loadAssets();
    }
  }, [isDeployed, loadAssets]);

  useEffect(() => {
    if (isConnected && isDeployed && publicKey) {
      loadKyc();
      checkUsdc();
    } else {
      setKycRecord(null);
      setUsdcStatus(null);
    }
  }, [isConnected, isDeployed, publicKey, loadKyc, checkUsdc]);

  const handleInvestClick = async (asset: OnChainAsset) => {
    if (!publicKey) {
      await connect();
      return;
    }

    if (asset.asset_owner === publicKey) {
      notification.error("Owners cannot purchase their own assets.");
      return;
    }

    if (asset.model.tag === "Fractional" && asset.state.tag === "Active") {
      notification.info("This asset is being tokenized. Please check back soon.");
      return;
    }

    setSelectedAsset(asset);

    if (asset.model.tag === "Fractional") {
      setIsTrustlineModalOpen(true);
    } else {
      handleInvestmentSuccess(asset);
    }
  };

  const handleInvestmentSuccess = async (assetOverride?: OnChainAsset) => {
    const asset = assetOverride || selectedAsset;
    if (!asset || !publicKey) return;

    setIsTrustlineModalOpen(false);

    if (asset.model.tag === "Fractional") {
      setIsBuyModalOpen(true);
      return;
    }

    setIsPurchasing(true);

    const isWhole = asset.model.tag === "WholeOwnership";
    const actionLabel = isWhole ? "processing your whole-asset purchase" : "processing your fractional investment";
    const notificationId = notification.loading(`${actionLabel} for ${asset.asset_name}...`);

    try {
      const { hash } = await purchaseWholeAsset(
        {
          buyer: publicKey,
          assetId: asset.asset_id,
        },
        publicKey,
      );

      notification.success(
        <div className="flex flex-col gap-1">
          <p className="font-bold uppercase tracking-tight text-xs">Purchase Successful!</p>
          <a
            href={getExplorerTxUrl(hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-primary hover:underline flex items-center gap-1"
          >
            Verify on Stellar Expert <ArrowRightIcon className="h-3 w-3" />
          </a>
        </div>,
      );

      await loadAssets();
      setSelectedAsset(null);
    } catch (e: any) {
      console.error("Investment failed", e);
      notification.error(`Investment failed: ${e.message || "Unknown error"}`);
    } finally {
      setIsPurchasing(false);
      notification.remove(notificationId);
    }
  };

  const handlePurchaseComplete = async () => {
    setIsBuyModalOpen(false);
    setSelectedAsset(null);
    await loadAssets();
  };

  const kycStatus = typeof kycRecord?.status === "string" ? kycRecord.status : kycRecord?.status?.tag;

  return (
    <div className="flex flex-col grow">
      <section className="mx-auto w-full max-w-5xl px-3 py-8 sm:px-4 md:py-12">
        <MarketplaceHeader stats={stats} />

        {!isDeployed ? (
          <div className="alert alert-info shadow-lg mb-10 border-blue-500/30 bg-blue-500/5">
            <InformationCircleIcon className="h-6 w-6 shrink-0" />
            <div>
              <p className="font-bold">Wait for Registry Deployment</p>
              <p className="text-sm text-base-content/70">
                The Vaultic on-chain registry is currently being synchronized.
              </p>
            </div>
          </div>
        ) : (
          <>
            {isConnected && publicKey && usdcStatus && (!usdcStatus.hasTrustline || !usdcStatus.isAuthorized) && (
              <WalletPreparationBanner publicKey={publicKey} onSuccess={checkUsdc} />
            )}
            <KycStatusBanner kycRecord={kycRecord} />
          </>
        )}

        {isLoading ? (
          <MarketplaceLoading />
        ) : assets.length === 0 && isDeployed ? (
          <div className="rounded-2xl border border-dashed border-base-300 p-16 text-center bg-base-100 italic text-base-content/50">
            No active opportunities at this time.
          </div>
        ) : (
          <div className="grid gap-6">
            {assets.map(asset => (
              <AssetCard
                key={asset.asset_id}
                asset={asset}
                isConnected={isConnected}
                isPurchasing={isPurchasing}
                kycStatus={kycStatus}
                onInvestClick={handleInvestClick}
                selectedAssetId={selectedAsset?.asset_id}
              />
            ))}
          </div>
        )}
      </section>

      {selectedAsset && (
        <>
          <TrustlineModal
            isOpen={isTrustlineModalOpen}
            onClose={() => setIsTrustlineModalOpen(false)}
            publicKey={publicKey ?? ""}
            assetCode={selectedAsset.asset_code}
            issuer={selectedAsset.issuer ?? ""}
            onSuccess={() => handleInvestmentSuccess()}
          />
          <BuySharesModal
            isOpen={isBuyModalOpen}
            onClose={() => setIsBuyModalOpen(false)}
            asset={selectedAsset}
            publicKey={publicKey ?? ""}
            onSuccess={handlePurchaseComplete}
          />
        </>
      )}
    </div>
  );
}
