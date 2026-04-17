"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { WalletIcon } from "@heroicons/react/24/outline";
import { AssetCard } from "~~/components/assets/AssetCard";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const MAX_ASSETS = 50;

export default function InvestorPage() {
  const { address } = useAccount();
  const { data: totalAssets, isLoading: isLoadingTotal } = useScaffoldReadContract({
    contractName: "VaulticAssetRegistry",
    functionName: "totalAssets",
  });

  const total = totalAssets !== undefined ? Number(totalAssets) : 0;
  const ids = Array.from({ length: Math.min(total, MAX_ASSETS) }, (_, i) => BigInt(i + 1));

  return (
    <div className="flex flex-col grow">
      <section className="px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <WalletIcon className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-base-content">Investor portfolio</h1>
          </div>
          <p className="text-base-content/80 mb-8">
            View your whole-asset and fractional token holdings. Funding progress is shown per asset.
          </p>

          {!address ? (
            <div className="rounded-2xl border border-base-300 bg-base-100 p-8 sm:p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-4">
                <WalletIcon className="h-7 w-7 text-base-content/60" />
              </div>
              <h2 className="text-xl font-bold text-base-content">Connect your wallet</h2>
              <p className="mt-2 text-base-content/70 max-w-md mx-auto">
                Connect your wallet to view your tokenized asset positions and funding progress.
              </p>
              <div className="mt-6">
                <RainbowKitCustomConnectButton />
              </div>
              <p className="mt-6 text-sm text-base-content/60">
                <Link href="/marketplace" className="link link-primary">
                  Browse the marketplace
                </Link>{" "}
                to invest in assets.
              </p>
            </div>
          ) : isLoadingTotal ? (
            <div className="rounded-xl border border-base-300 bg-base-100 p-8 text-center">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-base-content mb-4">Your positions</h2>
              <InvestorHoldingsList address={address as `0x${string}`} assetIds={ids} />
              <p className="mt-4 text-sm text-base-content/70">
                Positions reflect on-chain share balances from the Investment Manager. Buy shares in the marketplace on
                tokenized assets to see them here.
              </p>
            </>
          )}

          <div className="mt-8">
            <Link href="/marketplace" className="btn btn-primary gap-2">
              Browse marketplace
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function InvestorHoldingsList({ address, assetIds }: { address: `0x${string}`; assetIds: bigint[] }) {
  return (
    <div className="space-y-4">
      {assetIds.map(assetId => (
        <InvestorHoldingRow key={assetId.toString()} assetId={assetId} address={address} />
      ))}
    </div>
  );
}

function InvestorHoldingRow({ assetId, address }: { assetId: bigint; address: `0x${string}` }) {
  const { data: holdings } = useScaffoldReadContract({
    contractName: "VaulticInvestmentManager",
    functionName: "investorHoldings",
    args: [assetId, address],
  });

  const amount = (holdings as bigint | undefined) ?? 0n;
  if (amount === 0n) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <p className="text-xs font-medium text-primary/80 mb-2">Your shares: {amount.toString()}</p>
      <AssetCard assetId={assetId} showInvestmentPanel={false} />
    </div>
  );
}
