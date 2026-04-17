"use client";

import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import { InvestmentPanel } from "~~/components/assets/InvestmentPanel";
import { RelistAssetBlock } from "~~/components/assets/RelistAssetBlock";
import { RelistWholeAssetBlock } from "~~/components/assets/RelistWholeAssetBlock";
import { TokenProgressBar } from "~~/components/assets/TokenProgressBar";
import { TokenizationActions } from "~~/components/assets/TokenizationActions";
import { WholeAssetPurchaseBlock } from "~~/components/assets/WholeAssetPurchaseBlock";
import { WithdrawProceedsBlock } from "~~/components/assets/WithdrawProceedsBlock";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const ASSET_STATE_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Active",
  2: "Tokenized",
  3: "Closed",
  4: "Relisted",
};

const MODEL_LABELS: Record<number, string> = {
  0: "Whole",
  1: "Fractional",
};

type AssetCardProps = {
  assetId: bigint;
  showInvestmentPanel?: boolean;
  /** Show Approve/Tokenize actions for protocol owners (owner dashboard). */
  showTokenizationActions?: boolean;
  /** Show withdraw-proceeds block for asset owners (owner dashboard). */
  showWithdrawProceeds?: boolean;
  isRegistryOwner?: boolean;
  isInvestmentManagerOwner?: boolean;
};

export function AssetCard({
  assetId,
  showInvestmentPanel = false,
  showTokenizationActions = false,
  showWithdrawProceeds = false,
  isRegistryOwner = false,
  isInvestmentManagerOwner = false,
}: AssetCardProps) {
  const { data: asset, isLoading } = useScaffoldReadContract({
    contractName: "VaulticAssetRegistry",
    functionName: "getAsset",
    args: [assetId],
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-base-300 bg-base-100 p-5 animate-pulse">
        <div className="h-5 w-32 bg-base-300 rounded" />
        <div className="mt-2 h-4 w-24 bg-base-300 rounded" />
      </div>
    );
  }

  if (!asset) {
    return null;
  }

  const raw = Array.isArray(asset) ? asset[0] : asset;
  const rec = raw as {
    assetId: bigint;
    assetOwner: string;
    state: number;
    model: number;
    valuation: bigint;
    totalShares: bigint;
    soldShares: bigint;
    pricePerShare: bigint;
    tokenContract: string;
    assetName: string;
    assetCategory: string;
    metadataURI: string;
  };

  const stateLabel = ASSET_STATE_LABELS[rec.state] ?? "Unknown";
  const modelLabel = MODEL_LABELS[rec.model] ?? "Unknown";
  const valuationFormatted = rec.valuation ? (Number(rec.valuation) / 1e6).toLocaleString() : "0";
  const showProceedsBlock =
    showWithdrawProceeds &&
    (rec.state === 2 || rec.state === 3) &&
    !!rec.tokenContract &&
    rec.tokenContract !== "0x0000000000000000000000000000000000000000";
  const showRelistBlock =
    showTokenizationActions &&
    rec.state === 3 &&
    rec.model === 1 &&
    !!rec.tokenContract &&
    rec.tokenContract !== "0x0000000000000000000000000000000000000000";
  const showRelistWholeBlock = showWithdrawProceeds && rec.state === 3 && rec.model === 0;

  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-base-content">{rec.assetName || `Asset #${rec.assetId}`}</h3>
          <p className="text-sm text-base-content/70">{rec.assetCategory}</p>
        </div>
        <span className="badge badge-sm badge-outline">{stateLabel}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <span className="text-base-content/80">
          <span className="font-medium">Valuation:</span> ${valuationFormatted}
        </span>
        <span className="text-base-content/80">
          <span className="font-medium">Model:</span> {modelLabel}
        </span>
        <span className="text-base-content/60">
          <Address address={rec.assetOwner as `0x${string}`} format="short" />
        </span>
      </div>
      <p className="mt-2 text-sm">
        <Link href={`/asset/${assetId}`} className="link link-primary">
          Details
        </Link>
      </p>
      {rec.totalShares > 0n && (
        <div className="mt-4">
          <TokenProgressBar soldShares={rec.soldShares} totalShares={rec.totalShares} label="Funding" />
        </div>
      )}
      {showInvestmentPanel && rec.state === 1 && rec.model === 0 && rec.valuation > 0n && (
        <div className="mt-4 border-t border-base-300 pt-4">
          <WholeAssetPurchaseBlock assetId={assetId} valuation={rec.valuation} assetName={rec.assetName} />
        </div>
      )}
      {showInvestmentPanel &&
        rec.state === 2 &&
        rec.tokenContract &&
        rec.tokenContract !== "0x0000000000000000000000000000000000000000" && (
          <div className="mt-4 border-t border-base-300 pt-4">
            <InvestmentPanel assetId={assetId} pricePerShare={rec.pricePerShare} assetName={rec.assetName} />
          </div>
        )}
      {showProceedsBlock && <WithdrawProceedsBlock assetId={assetId} assetOwner={rec.assetOwner} />}
      {showRelistWholeBlock && <RelistWholeAssetBlock assetId={assetId} assetName={rec.assetName} />}
      {showRelistBlock && <RelistAssetBlock assetId={assetId} tokenContract={rec.tokenContract} />}
      {showTokenizationActions && (
        <TokenizationActions
          assetId={assetId}
          isRegistryOwner={isRegistryOwner}
          isInvestmentManagerOwner={isInvestmentManagerOwner}
          assetOverride={{ state: rec.state, model: rec.model, valuation: rec.valuation }}
        />
      )}
    </div>
  );
}
