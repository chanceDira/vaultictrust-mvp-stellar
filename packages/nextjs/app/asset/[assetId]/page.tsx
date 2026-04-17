"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Address } from "@scaffold-ui/components";
import { useAccount } from "wagmi";
import { ArrowLeftIcon, DocumentTextIcon, LinkIcon } from "@heroicons/react/24/outline";
import { InvestmentPanel } from "~~/components/assets/InvestmentPanel";
import { RelistWholeAssetBlock } from "~~/components/assets/RelistWholeAssetBlock";
import { WholeAssetPurchaseBlock } from "~~/components/assets/WholeAssetPurchaseBlock";
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

export default function AssetDetailsPage() {
  const params = useParams();
  const { address } = useAccount();
  const assetIdParam = params?.assetId;
  const assetId = assetIdParam ? BigInt(assetIdParam as string) : undefined;

  const {
    data: asset,
    isLoading,
    error,
  } = useScaffoldReadContract({
    contractName: "VaulticAssetRegistry",
    functionName: "getAsset",
    args: assetId !== undefined ? [assetId] : undefined,
  });

  if (assetId === undefined || (assetIdParam && isNaN(Number(assetIdParam)))) {
    return (
      <div className="flex flex-col grow">
        <section className="px-4 py-8 md:py-12">
          <div className="max-w-2xl mx-auto">
            <p className="text-base-content/70">Invalid asset ID.</p>
            <Link href="/marketplace" className="link link-primary mt-4 inline-flex items-center gap-1">
              <ArrowLeftIcon className="h-4 w-4" />
              Back to marketplace
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col grow">
        <section className="px-4 py-8 md:py-12">
          <div className="max-w-2xl mx-auto">
            <div className="rounded-xl border border-base-300 bg-base-100 p-8 flex justify-center">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="flex flex-col grow">
        <section className="px-4 py-8 md:py-12">
          <div className="max-w-2xl mx-auto">
            <p className="text-base-content/70">Asset not found or failed to load.</p>
            <Link href="/marketplace" className="link link-primary mt-4 inline-flex items-center gap-1">
              <ArrowLeftIcon className="h-4 w-4" />
              Back to marketplace
            </Link>
          </div>
        </section>
      </div>
    );
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
  const pricePerShareFormatted = rec.pricePerShare > 0n ? (Number(rec.pricePerShare) / 1e6).toFixed(2) : "—";
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const hasTokenContract = !!rec.tokenContract && rec.tokenContract !== zeroAddress;
  const hasMetadataURI = !!rec.metadataURI?.trim();

  return (
    <div className="flex flex-col grow">
      <section className="px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1 text-sm text-base-content/70 hover:text-primary mb-6"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to marketplace
          </Link>

          <div className="rounded-xl border border-base-300 bg-base-100 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-base-content">{rec.assetName || `Asset #${rec.assetId}`}</h1>
                <p className="text-base-content/70 mt-1">{rec.assetCategory}</p>
              </div>
              <span className="badge badge-lg badge-outline">{stateLabel}</span>
            </div>

            <dl className="mt-6 space-y-4">
              <div>
                <dt className="text-xs font-medium text-base-content/50 uppercase tracking-wide">Asset ID</dt>
                <dd className="mt-0.5 font-mono text-sm text-base-content">{rec.assetId.toString()}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-base-content/50 uppercase tracking-wide">Owner</dt>
                <dd className="mt-0.5">
                  <Address address={rec.assetOwner as `0x${string}`} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-base-content/50 uppercase tracking-wide">Valuation</dt>
                <dd className="mt-0.5 text-base-content">${valuationFormatted} (payment token, 6 decimals)</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-base-content/50 uppercase tracking-wide">Model</dt>
                <dd className="mt-0.5 text-base-content">{modelLabel}</dd>
              </div>
              {rec.totalShares > 0n && (
                <>
                  <div>
                    <dt className="text-xs font-medium text-base-content/50 uppercase tracking-wide">Total shares</dt>
                    <dd className="mt-0.5 text-base-content">{rec.totalShares.toString()}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-base-content/50 uppercase tracking-wide">Sold shares</dt>
                    <dd className="mt-0.5 text-base-content">{rec.soldShares.toString()}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-base-content/50 uppercase tracking-wide">
                      Price per share
                    </dt>
                    <dd className="mt-0.5 text-base-content">${pricePerShareFormatted} (payment token)</dd>
                  </div>
                </>
              )}
              {hasTokenContract && (
                <div>
                  <dt className="text-xs font-medium text-base-content/50 uppercase tracking-wide">Token contract</dt>
                  <dd className="mt-0.5">
                    <Address address={rec.tokenContract as `0x${string}`} />
                  </dd>
                </div>
              )}
              {hasMetadataURI && (
                <div>
                  <dt className="text-xs font-medium text-base-content/50 uppercase tracking-wide flex items-center gap-1">
                    <LinkIcon className="h-3.5 w-3.5" />
                    External documentation
                  </dt>
                  <dd className="mt-0.5">
                    <a
                      href={rec.metadataURI}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary inline-flex items-center gap-1 break-all"
                    >
                      <DocumentTextIcon className="h-4 w-4 shrink-0" />
                      {rec.metadataURI}
                    </a>
                    <p className="text-xs text-base-content/50 mt-1">
                      Off-chain link; may be a document or metadata URL.
                    </p>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {rec.state === 1 && rec.model === 0 && rec.valuation > 0n && (
            <div className="mt-6">
              <WholeAssetPurchaseBlock assetId={rec.assetId} valuation={rec.valuation} assetName={rec.assetName} />
            </div>
          )}

          {rec.state === 2 && rec.pricePerShare > 0n && hasTokenContract && (
            <div className="mt-6">
              <InvestmentPanel assetId={rec.assetId} pricePerShare={rec.pricePerShare} assetName={rec.assetName} />
            </div>
          )}

          {rec.state === 4 && rec.model === 1 && (
            <div className="mt-6 rounded-lg border border-base-300 bg-base-200/60 p-4">
              <p className="text-sm text-base-content/80">
                This asset is relisted for fractional offering. A protocol admin must tokenize it to open share sales.
              </p>
            </div>
          )}

          {rec.state === 3 &&
            rec.model === 0 &&
            address &&
            address.toLowerCase() === (rec.assetOwner as string).toLowerCase() && (
              <div className="mt-6">
                <RelistWholeAssetBlock assetId={rec.assetId} assetName={rec.assetName} />
              </div>
            )}

          <p className="mt-6 text-sm text-base-content/60">
            <Link href="/owner" className="link link-primary">
              Owner dashboard
            </Link>
            {" · "}
            <Link href="/marketplace" className="link link-primary">
              Marketplace
            </Link>
            {" · "}
            <Link href="/support" className="link link-primary">
              Support
            </Link>
          </p>
          <p className="mt-2 text-xs text-base-content/50">
            Buying shares? You&apos;ll confirm 3 transactions in your wallet. See{" "}
            <Link href="/support" className="link link-hover">
              Support
            </Link>{" "}
            or{" "}
            <Link href="/terms" className="link link-hover">
              Terms of Service
            </Link>{" "}
            for details.
          </p>
        </div>
      </section>
    </div>
  );
}
