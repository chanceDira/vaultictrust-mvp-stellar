"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { BuildingOffice2Icon, WalletIcon } from "@heroicons/react/24/outline";
import { AssetCard } from "~~/components/assets/AssetCard";
import { AssetForm } from "~~/components/assets/AssetForm";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export default function OwnerPage() {
  const { address, isConnected } = useAccount();
  const { data: assetIds, isLoading: isLoadingIds } = useScaffoldReadContract({
    contractName: "VaulticAssetRegistry",
    functionName: "getAssetsByOwner",
    args: address ? [address] : undefined,
  });
  const { data: registryOwner } = useScaffoldReadContract({
    contractName: "VaulticAssetRegistry",
    functionName: "owner",
  });
  const { data: investmentManagerOwner } = useScaffoldReadContract({
    contractName: "VaulticInvestmentManager",
    functionName: "owner",
  });

  const { data: totalAssets } = useScaffoldReadContract({
    contractName: "VaulticAssetRegistry",
    functionName: "totalAssets",
  });

  const ids = (assetIds as bigint[] | undefined) ?? [];
  const total = totalAssets !== undefined ? Number(totalAssets) : 0;
  const allIds = Array.from({ length: Math.min(total, 50) }, (_, i) => BigInt(i + 1));
  const isRegistryOwner =
    !!address && !!registryOwner && address.toLowerCase() === (registryOwner as string).toLowerCase();
  const isInvestmentManagerOwner =
    !!address && !!investmentManagerOwner && address.toLowerCase() === (investmentManagerOwner as string).toLowerCase();
  const isProtocolOwner = isRegistryOwner || isInvestmentManagerOwner;

  return (
    <div className="flex flex-col grow">
      <section className="px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BuildingOffice2Icon className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-base-content">Owner dashboard</h1>
          </div>
          <p className="text-base-content/80 mb-8">
            Submit real-world assets with documentation. Choose whole-asset sale or fractional tokenization.
          </p>

          {!isConnected ? (
            <div className="rounded-2xl border border-base-300 bg-base-100 p-8 sm:p-10 text-center shadow-sm">
              <div className="w-14 h-14 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-4">
                <WalletIcon className="h-7 w-7 text-base-content/60" />
              </div>
              <h2 className="text-xl font-bold text-base-content">Connect your wallet</h2>
              <p className="mt-2 text-base-content/70 max-w-md mx-auto">
                You must connect your wallet to access the owner dashboard and register or manage assets.
              </p>
              <div className="mt-6">
                <RainbowKitCustomConnectButton />
              </div>
              <p className="mt-6 text-sm text-base-content/60">
                <Link href="/litepaper" className="link link-primary">
                  Read the litepaper
                </Link>
                {" · "}
                <Link href="/marketplace" className="link link-primary">
                  Browse marketplace
                </Link>
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <AssetForm />
              </div>

              <h2 className="text-xl font-bold text-base-content mb-4">Your assets</h2>
              {isLoadingIds ? (
                <div className="rounded-xl border border-base-300 bg-base-100 p-8 text-center">
                  <span className="loading loading-spinner loading-md" />
                </div>
              ) : ids.length === 0 ? (
                <div className="rounded-xl border border-base-300 bg-base-100 p-8 text-center text-base-content/70">
                  No assets yet. Register an asset above or{" "}
                  <Link href="/marketplace" className="link link-primary">
                    browse the marketplace
                  </Link>
                  .
                </div>
              ) : (
                <div className="space-y-4">
                  {ids.map(id => (
                    <AssetCard
                      key={id.toString()}
                      assetId={id}
                      showInvestmentPanel={false}
                      showTokenizationActions
                      showWithdrawProceeds
                      isRegistryOwner={isRegistryOwner}
                      isInvestmentManagerOwner={isInvestmentManagerOwner}
                    />
                  ))}
                </div>
              )}

              {isProtocolOwner && total > 0 && (
                <>
                  <h2 className="text-xl font-bold text-base-content mt-10 mb-4">
                    All listed assets (approve or tokenize)
                  </h2>
                  <p className="text-sm text-base-content/70 mb-4">
                    As registry or investment manager owner, you can approve pending assets and tokenize active
                    fractional assets below.
                  </p>
                  <div className="space-y-4">
                    {allIds.map(id => (
                      <AssetCard
                        key={id.toString()}
                        assetId={id}
                        showInvestmentPanel={false}
                        showTokenizationActions
                        showWithdrawProceeds
                        isRegistryOwner={isRegistryOwner}
                        isInvestmentManagerOwner={isInvestmentManagerOwner}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
