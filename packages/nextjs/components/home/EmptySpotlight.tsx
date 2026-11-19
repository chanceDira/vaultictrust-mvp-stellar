import type { ReactElement } from "react";
import Link from "next/link";

export function EmptySpotlight(): ReactElement {
  return (
    <div className="rounded-3xl border border-dashed border-primary/30 bg-base-100/80 p-8 text-center backdrop-blur">
      <p className="text-lg font-bold text-base-content">Listings appear here after review</p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-base-content/70">
        Nothing is open right now. Owners can submit an asset today, and it shows up on the marketplace once it is
        approved.
      </p>
      <Link href="/owner" className="btn btn-primary btn-sm mt-5 rounded-xl px-6">
        Submit an asset
      </Link>
    </div>
  );
}
