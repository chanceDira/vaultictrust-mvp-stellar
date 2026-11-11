import type { ReactElement } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { CopyAddress } from "~~/components/ui/CopyAddress";
import type { AssetMetadata } from "~~/services/stellar/assetMetadata";
import type { OnChainAsset } from "~~/types/stellar";
import { listingStatusLabel } from "~~/utils/vaultic/listingLabels";

type FeaturedListingBodyProps = {
  asset: OnChainAsset;
  metadata: AssetMetadata | null;
  metadataLoading: boolean;
  visible: boolean;
  index: number;
  total: number;
  sharePrice: number;
  availableShares: number;
  valuationLabel: string;
  onSelect: (index: number) => void;
  listings: { id: number; name: string }[];
};

export function FeaturedListingBody({
  asset,
  metadata,
  metadataLoading,
  visible,
  index,
  total,
  sharePrice,
  availableShares,
  valuationLabel,
  onSelect,
  listings,
}: FeaturedListingBodyProps): ReactElement {
  return (
    <>
      {metadata?.imageUrl ? (
        <div className="relative h-56 w-full sm:h-72">
          <Image src={metadata.imageUrl} alt="" fill sizes="100vw" className="object-cover" />
        </div>
      ) : null}
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_17rem] xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div
          className={`px-5 py-5 transition-opacity duration-300 ease-out sm:px-8 sm:py-6 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          aria-live="polite"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <span className="rounded-md border border-base-300/80 bg-base-200/50 px-2 py-0.5 text-xs font-semibold text-base-content/70">
                {asset.asset_code}
              </span>
              <span className="rounded-md border border-base-300/80 bg-base-200/50 px-2 py-0.5 text-xs font-semibold text-base-content/70">
                {metadata?.location || asset.asset_category}
              </span>
              {total > 1 ? (
                <span className="text-xs tabular-nums text-base-content/40">
                  {index + 1} / {total}
                </span>
              ) : null}
            </div>
            <h3 className="mt-3 text-center text-xl font-semibold leading-tight tracking-tight text-base-content sm:text-2xl md:text-left">
              <Link href={`/asset/${asset.asset_id}`} className="hover:text-primary">
                {asset.asset_name}
              </Link>
            </h3>
            <p className="mt-2 text-center text-sm font-medium text-base-content/70 md:text-left">
              {asset.model.tag === "Fractional" ? "Sold as shares" : "Sold as one asset"}
            </p>
            <div className="mx-auto mt-3 max-w-sm md:mx-0">
              <CopyAddress label="Owner" address={asset.asset_owner} />
            </div>
            {metadata?.description ? (
              <p className="mx-auto mt-3 line-clamp-3 max-w-2xl text-center text-sm font-medium leading-relaxed text-base-content/80 md:mx-0 md:text-left">
                {metadata.description}
              </p>
            ) : metadataLoading ? (
              <p className="mt-3 text-center text-sm font-medium text-base-content/50 md:text-left">
                Loading the listing details
              </p>
            ) : null}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 text-center sm:grid-cols-3 sm:gap-6 md:text-left">
            <div>
              <p className="text-sm font-semibold text-base-content/70">Share price</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-base-content">${sharePrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-base-content/70">Available</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-base-content">
                {availableShares.toLocaleString()}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-sm font-semibold text-base-content/70">Status</p>
              <p className="mt-1 text-lg font-bold text-primary">{listingStatusLabel(asset.state.tag)}</p>
            </div>
          </div>
          {total > 1 ? (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {listings.map((listing, i) => (
                <button
                  key={listing.id}
                  type="button"
                  aria-label={`Show listing ${i + 1}: ${listing.name}`}
                  aria-current={i === index ? "true" : undefined}
                  onClick={() => onSelect(i)}
                  className={`live-showcase__dot ${i === index ? "live-showcase__dot--active" : ""}`}
                />
              ))}
            </div>
          ) : null}
        </div>
        <div className="live-showcase__valuation flex min-w-0 flex-col justify-between border-t border-base-300/60 lg:border-t-0 lg:border-l">
          <div className="min-w-0 p-4 sm:p-5">
            <p className="text-sm font-semibold text-base-content/70">Value</p>
            <p className="mt-2 max-w-full break-words text-2xl font-bold leading-tight tabular-nums text-base-content">
              ${valuationLabel}
            </p>
            <p className="mt-2 text-sm font-medium text-base-content/50">USDC</p>
          </div>
          <div className="flex flex-col gap-2 border-t border-primary/10 p-5 sm:p-6">
            <Link href={`/asset/${asset.asset_id}`} className="btn btn-primary btn-sm w-full gap-2 rounded-xl">
              Open this listing
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
