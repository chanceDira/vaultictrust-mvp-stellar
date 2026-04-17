"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { Squares2X2Icon, WalletIcon } from "@heroicons/react/24/outline";
import { AssetCard } from "~~/components/assets/AssetCard";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const MAX_ASSETS = 50;

export default function MarketplacePage() {
  const { isConnected } = useAccount();
  const { data: totalAssets, isLoading: isLoadingTotal } = useScaffoldReadContract({
    contractName: "VaulticAssetRegistry",
    functionName: "totalAssets",
  });

  const total = totalAssets !== undefined ? Number(totalAssets) : 0;
  const ids = Array.from({ length: Math.min(total, MAX_ASSETS) }, (_, i) => BigInt(i + 1));

  return (
    <div className="flex flex-col grow">
      <section className="px-4 py-8 md:py-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Squares2X2Icon className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-base-content">Marketplace</h1>
          </div>
          <p className="text-base-content/80 mb-2">
            Browse tokenized assets. Invest in whole assets or buy fractions with on-chain ownership.
          </p>
          <p className="text-sm text-base-content/60 mb-6">
            <span className="font-medium text-base-content/70">Active</span> whole assets can be bought wholly;{" "}
            <span className="font-medium text-base-content/70">Tokenized</span> assets can be bought in shares. Pending
            assets are not yet open for investment.
          </p>

          {!isConnected && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <WalletIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-base-content">Connect your wallet to invest</p>
                  <p className="text-sm text-base-content/70">
                    You can browse assets below. Connect a wallet to purchase shares.
                  </p>
                </div>
              </div>
              <RainbowKitCustomConnectButton />
            </div>
          )}

          {isLoadingTotal ? (
            <div className="rounded-xl border border-base-300 bg-base-100 p-12 text-center">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : total === 0 ? (
            <div className="card bg-base-100 border border-base-300 shadow-sm">
              <div className="card-body items-center text-center py-12">
                <Squares2X2Icon className="h-16 w-16 text-base-300" />
                <h2 className="card-title text-lg">No assets listed</h2>
                <p className="text-base-content/70 text-sm max-w-md">
                  Tokenized assets will appear here when they are registered and listed. Asset owners can register from
                  the Owner dashboard.
                </p>
                <Link href="/owner" className="btn btn-ghost mt-2">
                  Owner dashboard
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
              {ids.map(id => (
                <AssetCard key={id.toString()} assetId={id} showInvestmentPanel />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
