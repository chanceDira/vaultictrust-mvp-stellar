"use client";

import { useState } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { RpcErrorBoundary } from "~~/components/RpcErrorBoundary";
import { AssetCard } from "~~/components/marketplace/AssetCard";
import { KycStatusBanner } from "~~/components/marketplace/KycStatusBanner";
import {
  MarketplaceHeader,
  MarketplaceLoading,
  WalletPreparationBanner,
} from "~~/components/marketplace/MarketplaceLayout";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { PAGE_SIZE, useAssets, useTotalAssets } from "~~/hooks/vaultic/useAssets";
import { useChainData } from "~~/hooks/vaultic/useChainData";
import { getContractIds } from "~~/services/stellar/sorobanService";

export default function MarketplacePage() {
  const { isConnected, publicKey } = useStellarWallet();
  const [pageIndex, setPageIndex] = useState(0);

  const contracts = getContractIds();
  const isDeployed = !!contracts.registry;

  const { assets, isLoading } = useAssets(pageIndex);
  const total = useTotalAssets();
  const { kycRecord, usdcStatus, refreshUsdc } = useChainData(isConnected ? publicKey : null, isDeployed);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const stats = {
    totalAssets: total,
    tvl: assets
      .reduce((acc, curr) => acc + Number(curr.valuation || 0n) / 1e7, 0)
      .toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  };

  return (
    <div className="flex flex-col grow">
      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
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

        <RpcErrorBoundary label="asset list">
          {isLoading ? (
            <MarketplaceLoading />
          ) : assets.length === 0 && isDeployed ? (
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 p-8 text-center text-base-content/70 sm:p-10">
              No listings are open right now.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {assets.map(asset => (
                <AssetCard key={asset.asset_id} asset={asset} />
              ))}
            </div>
          )}
        </RpcErrorBoundary>

        {totalPages > 1 && (
          <div data-testid="pagination" className="mt-10 flex items-center justify-center gap-3">
            <button
              data-testid="pagination-prev"
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
              data-testid="pagination-next"
              className="btn btn-outline btn-sm rounded-xl"
              disabled={pageIndex >= totalPages - 1}
              onClick={() => setPageIndex(p => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
