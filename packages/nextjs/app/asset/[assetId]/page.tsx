"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { AssetListingView } from "~~/components/asset/AssetListingView";
import { BuySharesModal } from "~~/components/modals/BuySharesModal";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { TrustlineModal } from "~~/components/stellar/TrustlineModal";
import { PageLoading } from "~~/components/ui/PageLoading";
import { PageStatus } from "~~/components/ui/PageStatus";
import { useAssetMetadata } from "~~/hooks/vaultic/useAssetMetadata";
import { useAssetRecord } from "~~/hooks/vaultic/useAssetRecord";
import { useProtocolFee } from "~~/hooks/vaultic/useProtocolFee";
import { usePurchasesPaused } from "~~/hooks/vaultic/usePurchasesPaused";
import { getExplorerTxUrl } from "~~/scaffold.config";
import { formatListedDate } from "~~/services/stellar/assetMetadata";
import { purchaseWholeAsset } from "~~/services/stellar/sorobanService";
import { notification } from "~~/utils/vaultic";

export default function AssetDetailsPage() {
  const { assetId } = useParams();
  const { publicKey, connect } = useStellarWallet();
  const { asset, loading, loadError, fromCopy, yieldRoundCount, reload } = useAssetRecord(assetId);
  const [isTrustlineOpen, setIsTrustlineOpen] = useState(false);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [buyingWhole, setBuyingWhole] = useState(false);
  const { metadata, unavailable, isLoading: metadataLoading } = useAssetMetadata(asset?.metadata_uri ?? "");
  const fee = useProtocolFee(asset?.model.tag === "WholeOwnership");
  const { paused: purchasesPaused } = usePurchasesPaused();

  const handleBuy = async () => {
    if (!asset || fromCopy || purchasesPaused) return;
    if (!publicKey) {
      await connect();
      return;
    }
    if (asset.asset_owner === publicKey) {
      notification.error("Owners cannot purchase their own assets.");
      return;
    }
    if (asset.model.tag === "Fractional") {
      if (asset.state.tag === "Active") {
        notification.info("Shares are not for sale yet.");
        return;
      }
      setIsTrustlineOpen(true);
      return;
    }

    setBuyingWhole(true);
    const notifId = notification.loading(`Processing purchase for ${asset.asset_name}`);
    try {
      const { hash } = await purchaseWholeAsset({ buyer: publicKey, assetId: asset.asset_id }, publicKey);
      notification.success(
        <a href={getExplorerTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="font-bold text-primary">
          Purchase sent. View the transaction.
        </a>,
      );
      await reload();
    } catch (e: unknown) {
      notification.error(`Purchase failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setBuyingWhole(false);
      notification.remove(notifId);
    }
  };

  if (loading) return <PageLoading label="Loading asset" />;

  if (loadError) {
    return (
      <PageStatus
        variant="error"
        title="Could not load asset"
        description="We could not fetch this asset from the network. Check your connection and try again."
        onRetry={reload}
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
        description="This asset does not exist on VTrust Africa or may have been removed."
        actions={[
          { label: "Marketplace", href: "/marketplace", primary: true },
          { label: "Go home", href: "/" },
        ]}
      />
    );
  }

  let description = "The owner has not written a description yet.";
  if (metadataLoading) description = "Loading the listing details";
  else if (unavailable) description = "Listing details are unavailable right now.";
  else if (metadata?.description) description = metadata.description;

  return (
    <>
      <AssetListingView
        asset={asset}
        description={description}
        imageUrl={metadata?.imageUrl ?? null}
        location={metadata?.location ?? ""}
        documents={metadata?.documents ?? []}
        documentsLoading={metadataLoading}
        documentsUnavailable={unavailable}
        feeBps={fee.bps}
        feeLoading={fee.loading}
        feeUnavailable={fee.unavailable}
        listedOn={formatListedDate(asset.registered_at)}
        yieldRoundCount={yieldRoundCount}
        buyingWhole={buyingWhole}
        fromCopy={fromCopy}
        purchasesPaused={purchasesPaused === true}
        onBuy={handleBuy}
      />
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
          void reload();
        }}
      />
    </>
  );
}
