"use client";

import type { NextPage } from "next";
import Link from "next/link";

const AssetDetailsPage: NextPage = () => {
  return (
    <div className="flex flex-col grow items-center justify-center py-16 px-4 text-center">
      <h1 className="text-xl font-bold text-base-content">Asset Details</h1>
      <p className="mt-2 text-sm text-base-content/60 max-w-sm">
        Individual asset detail pages are being updated for the Stellar migration. 
        Please browse the marketplace to see the current inventory.
      </p>
      <div className="mt-6">
        <Link href="/marketplace" className="btn btn-primary btn-sm">Back to Marketplace</Link>
      </div>
    </div>
  );
};

export default AssetDetailsPage;
