import type { ReactElement } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { AssetBuyPanel } from "~~/components/asset/AssetBuyPanel";
import { DocumentRoom } from "~~/components/asset/DocumentRoom";
import { ListingFacts } from "~~/components/asset/ListingFacts";
import { ListingPlate } from "~~/components/marketplace/ListingPlate";
import { OnChainAsset } from "~~/types/stellar";
import type { ListingDocument } from "~~/utils/vaultic/listingDocument";
import { listingStatusLabel, saleTypeLabel } from "~~/utils/vaultic/listingLabels";

type AssetListingViewProps = {
  asset: OnChainAsset;
  description: string;
  imageUrl: string | null;
  location: string;
  documents: ListingDocument[];
  documentsLoading: boolean;
  documentsUnavailable: boolean;
  feeBps: bigint | null;
  feeLoading: boolean;
  feeUnavailable: boolean;
  listedOn: string;
  yieldRoundCount: number | null;
  buyingWhole: boolean;
  fromCopy: boolean;
  onBuy: () => void;
};

const FULL_PERCENT = 100;
const REVIEWED_STATES = new Set(["Tokenized", "Active", "Closed", "Relisted"]);

export function AssetListingView({
  asset,
  description,
  imageUrl,
  location,
  documents,
  documentsLoading,
  documentsUnavailable,
  feeBps,
  feeLoading,
  feeUnavailable,
  listedOn,
  yieldRoundCount,
  buyingWhole,
  fromCopy,
  onBuy,
}: AssetListingViewProps): ReactElement {
  const totalShares = Number(asset.total_shares);
  const soldShares = Number(asset.sold_shares);
  const availableShares = totalShares - soldShares;
  const soldPercent =
    totalShares > 0 ? Math.min(FULL_PERCENT, Math.round((soldShares / totalShares) * FULL_PERCENT)) : 0;
  const forSale = asset.state.tag === "Tokenized";
  const valuationUsdc = Number(asset.valuation) / 1e7;
  const pricePerShare = Number(asset.price_per_share) / 1e7;

  return (
    <div className="flex grow flex-col pb-16">
      <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <Link href="/marketplace" className="btn btn-ghost btn-sm mb-4 gap-2 rounded-xl font-semibold">
          <ArrowLeftIcon className="h-3 w-3" />
          Back to Marketplace
        </Link>
        {fromCopy ? (
          <p className="mb-4 text-sm font-medium text-base-content/70">
            Saved copy. The chain could not be read, so buying is paused.
          </p>
        ) : null}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <article className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
            <ListingPlate
              code={asset.asset_code}
              category={asset.asset_category}
              imageUrl={imageUrl}
              status={listingStatusLabel(asset.state.tag)}
              forSale={forSale}
              tall
            >
              <h1 className="page-title max-w-[68%] leading-tight">{asset.asset_name}</h1>
              <p className="mt-1 max-w-[68%] text-sm font-medium text-base-content/70">
                {asset.asset_code}
                {location ? ` · ${location}` : ""}
              </p>
            </ListingPlate>
            <div className="space-y-5 p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-base-content/55">Asset value</p>
                  <p className="mt-1 break-words text-2xl font-bold tabular-nums text-base-content">
                    ${valuationUsdc.toLocaleString()}
                  </p>
                  <p className="text-xs font-medium text-base-content/50">USDC</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-base-content/55">Share price</p>
                  <p className="mt-1 break-words text-2xl font-bold tabular-nums text-base-content">
                    {forSale ? pricePerShare.toFixed(2) : "Not issued"}
                  </p>
                  <p className="text-xs font-medium text-base-content/50">{forSale ? "USDC" : "Soon"}</p>
                </div>
              </div>
              {forSale ? (
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-base-content/55">
                    <span>{soldPercent}% sold</span>
                    <span className="tabular-nums">{availableShares.toLocaleString()} left</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-base-200">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${soldPercent}%` }} />
                  </div>
                </div>
              ) : null}
              <div>
                <h2 className="text-sm font-semibold text-base-content">About this listing</h2>
                <p className="mt-1 text-sm font-medium leading-relaxed text-base-content/80">{description}</p>
                {REVIEWED_STATES.has(asset.state.tag) ? (
                  <p className="mt-2 text-sm font-medium text-base-content/60">
                    VTrust Africa reviewed this listing before shares went on sale.
                  </p>
                ) : null}
              </div>
              <DocumentRoom documents={documents} loading={documentsLoading} unavailable={documentsUnavailable} />
              <ListingFacts
                listedOn={listedOn}
                location={location}
                saleType={saleTypeLabel(asset.model.tag)}
                listingNumber={asset.asset_id}
                totalShares={totalShares}
                soldShares={soldShares}
                availableShares={availableShares}
                yieldRoundCount={yieldRoundCount}
                assetCode={asset.asset_code}
                owner={asset.asset_owner}
                issuer={asset.issuer}
              />
            </div>
          </article>
          <AssetBuyPanel
            assetCode={asset.asset_code}
            totalShares={totalShares}
            availableShares={availableShares}
            wholeAsset={asset.model.tag === "WholeOwnership"}
            valuation={asset.valuation}
            feeBps={feeBps}
            feeLoading={feeLoading}
            feeUnavailable={feeUnavailable}
            busy={buyingWhole}
            chainUnavailable={fromCopy}
            onBuy={onBuy}
          />
        </div>
      </section>
    </div>
  );
}
