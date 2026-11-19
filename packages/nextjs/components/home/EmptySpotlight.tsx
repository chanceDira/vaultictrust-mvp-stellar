import type { ReactElement } from "react";
import Link from "next/link";

export function EmptySpotlight(): ReactElement {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-8">
      <p className="text-lg font-bold text-base-content">Nothing is open right now</p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-base-content/70">
        A listing appears here once VTrust Africa has reviewed it. Owners can submit an asset today.
      </p>
      <Link href="/owner" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
        Submit an asset
      </Link>
    </div>
  );
}
