"use client";

import { useState } from "react";
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
import { useAssets, useTotalAssets, PAGE_SIZE } from "~~/hooks/vaultic/useAssets";
import { useChainData } from "~~/hooks/vaultic/useChainData";
import { getExplorerTxUrl } from "~~/scaffold.config";
import { getContractIds, purchaseWholeAsset } from "~~/services/stellar/sorobanService";
import type { OnChainAsset } from "~~/types/stellar";
import { notification } from "~~/utils/vaultic";

export default function MarketplacePage() {
  const { isConnected, publicKey, connect } = useStellarWallet();
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState<OnChainAsset | null>(null);
  const [isTrustlineModalOpen, setIsTrustlineModalOpen] = useState(false);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const contracts = getContractIds();
  const isDeployed = !!contracts.registry;

  const { assets, isLoading, refresh: refreshAssets } = useAssets(pageIndex);
  const total = useTotalAssets();
  const { kycRecord, usdcStatus, refreshUsdc } = useChainData(isConnected ? publicKey : null, isDeployed);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const kycStatus = typeof kycRecord?.status === "string" ? kycRecord.status : kycRecord?.status?.tag;

  const stats = {
    totalAssets: total,
    tvl: assets
      .reduce((acc, curr) => acc + Number(curr.valuation || 0n) / 1e7, 0)
      .toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  };

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
    const asset = assetOverride ?? selectedAsset;
    if (!asset || !publicKey) return;
    setIsTrustlineModalOpen(false);

    if (asset.model.tag === "Fractional") {
      setIsBuyModalOpen(true);
      return;
    }

    setIsPurchasing(true);
    const notifId = notification.loading(`processing purchase for ${asset.asset_name}...`);

    try {
      const { hash } = await purchaseWholeAsset({ buyer: publicKey, assetId: asset.asset_id }, publicKey);
      notification.success(
        <div className="flex flex-col gap-1">
          <p className="font-bold uppercase tracking-tight text-xs">Purchase successful!</p>
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
      await refreshAssets();
      setSelectedAsset(null);
    } catch (e: unknown) {
      notification.error(`Investment failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setIsPurchasing(false);
      notification.remove(notifId);
    }
  };

  const handlePurchaseComplete = async () => {
    setIsBuyModalOpen(false);
    setSelectedAsset(null);
    await refreshAssets();
  };

  return (
    <div className="flex flex-col grow">
      <section className="mx-auto w-full max-w-5xl px-3 py-8 sm:px-4 md:py-12">
        <MarketplaceHeader stats={stats} />

        {!isDeployed ? (
          <div className="alert alert-info shadow-lg mb-10 border-blue-500/30 bg-blue-500/5">
            <InformationCircleIcon className="h-6 w-6 shrink-0" />
            <div>
              <p className="font-bold">Registry not deployed</p>
              <p className="text-sm text-base-content/70">The on-chain registry is being synchronized.</p>
            </div>
          </div>
        ) : (
          <>
            {isConnected && publicKey && usdcStatus && (!usdcStatus.hasTrustline || !usdcStatus.isAuthorized) && (
              <WalletPreparationBanner publicKey={publicKey} onSuccess={refreshUsdc} />
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

        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3">
            <button
              className="btn btn-outline btn-sm rounded-xl"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex(p => p - 1)}
            >
              Previous
            </button>
            <span className="text-sm text-base-content/50">
              {pageIndex + 1} / {totalPages}
            </span>
            <button
              className="btn btn-outline btn-sm rounded-xl"
              disabled={pageIndex >= totalPages - 1}
              onClick={() => setPageIndex(p => p + 1)}
            >
              Next
            </button>
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
