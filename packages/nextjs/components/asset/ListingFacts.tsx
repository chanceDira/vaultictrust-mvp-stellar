import type { ReactElement } from "react";
import Link from "next/link";
import { CopyAddress } from "~~/components/ui/CopyAddress";
import { getExplorerAssetUrl } from "~~/scaffold.config";

type ListingFactsProps = {
  listedOn: string;
  location: string;
  saleType: string;
  listingNumber: number;
  totalShares: number;
  soldShares: number;
  availableShares: number;
  yieldRoundCount: number | null;
  assetCode: string;
  owner: string;
  issuer: string | null;
};

function Fact({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-base-content/55">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-semibold text-base-content">{value}</dd>
    </div>
  );
}

export function ListingFacts({
  listedOn,
  location,
  saleType,
  listingNumber,
  totalShares,
  soldShares,
  availableShares,
  yieldRoundCount,
  assetCode,
  owner,
  issuer,
}: ListingFactsProps): ReactElement {
  const sameIssuer = Boolean(issuer && issuer === owner);

  return (
    <div className="border-t border-base-300/80 pt-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Fact label="Listed" value={listedOn || "Not recorded"} />
        <Fact label="Place" value={location || "Not set"} />
        <Fact label="Sale" value={saleType} />
        <Fact label="Listing" value={`#${listingNumber}`} />
        <Fact label="Share code" value={assetCode} />
        <Fact label="Yield rounds" value={yieldRoundCount === null ? "Unavailable" : String(yieldRoundCount)} />
        <Fact label="Total shares" value={totalShares.toLocaleString()} />
        <Fact label="Sold" value={soldShares.toLocaleString()} />
        <Fact label="Available" value={availableShares.toLocaleString()} />
      </dl>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <CopyAddress label="Owner" address={owner} />
        {issuer ? (
          <CopyAddress label="Share issuer" address={issuer} />
        ) : (
          <Fact label="Share issuer" value="Not issued" />
        )}
      </div>
      {sameIssuer ? (
        <p className="mt-2 text-xs font-medium text-base-content/60">
          The share issuer is the same account as the owner.
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {issuer ? (
          <a
            href={getExplorerAssetUrl(assetCode, issuer)}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-primary"
          >
            Share asset on Stellar Expert
          </a>
        ) : null}
        <Link href="/contracts" className="text-sm font-semibold text-primary">
          Contract addresses
        </Link>
      </div>
    </div>
  );
}
