"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  DocumentTextIcon,
  PlusIcon,
  SparklesIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { RegisterModal } from "~~/components/modals/RegisterModal";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { fetchAsset, fetchAssetsByOwner, getContractIds } from "~~/services/stellar/sorobanService";
import { OnChainAsset } from "~~/types/stellar";

// ---------------------------------------------------------------------------
// Owner Dashboard
// ---------------------------------------------------------------------------

export default function OwnerPage() {
  const { isConnected, publicKey } = useStellarWallet();
  const [assets, setAssets] = useState<OnChainAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const contracts = getContractIds();
  const isDeployed = !!contracts.registry;

  const loadOwnerAssets = useCallback(async () => {
    if (!publicKey || !isDeployed) return;
    setIsLoading(true);
    try {
      const ids = await fetchAssetsByOwner(publicKey);
      const items: OnChainAsset[] = [];
      for (const id of ids) {
        const asset = await fetchAsset(id);
        if (asset) items.push(asset as OnChainAsset);
      }
      setAssets(items.reverse());
    } catch (e: any) {
      console.error("Failed to load owner assets:", e);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, isDeployed]);

  useEffect(() => {
    loadOwnerAssets();
  }, [loadOwnerAssets]);

  return (
    <div className="flex flex-col grow min-h-screen">
      <section className="px-4 py-8 md:py-12 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
            <BuildingOffice2Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-base-content uppercase tracking-tighter">Owner Dashboard</h1>
            <p className="text-[10px] text-base-content/40 uppercase tracking-[0.2em] font-bold">
              RWA Submission & Issuance
            </p>
          </div>
        </div>
        <p className="text-base-content/70 mb-8 max-w-2xl">
          Manage your real-world assets on the Stellar Network. Submit new assets for compliance review and monitor the
          progress of your tokenized offerings.
        </p>

        {!isConnected ? (
          <div className="rounded-3xl border border-dashed border-base-300 p-12 text-center bg-base-100 shadow-sm">
            <WalletIcon className="h-16 w-16 text-base-content/20 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-base-content mb-2">Connect Your Wallet</h2>
            <p className="text-base-content/60 mb-8 max-w-sm mx-auto">
              Sign in with Freighter to manage your African RWA listings and monitor tokenization.
            </p>
            <StellarConnectButton />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-3 bg-base-100 px-4 py-2.5 rounded-2xl border border-base-300">
                <div className="h-2 w-2 rounded-full bg-success shadow-[0_0_8px] shadow-success" />
                <span className="text-xs font-mono font-bold text-base-content/60">{publicKey}</span>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="btn btn-primary btn-md rounded-2xl gap-2 px-8 shadow-lg shadow-primary/20 w-full md:w-auto stellar-glow font-black uppercase tracking-widest"
              >
                <PlusIcon className="h-5 w-5" />
                Register New Asset
              </button>
            </div>

            {/* Assets list */}
            <div className="space-y-6">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-base-content/40 flex items-center gap-2">
                <SparklesIcon className="h-4 w-4" /> Your Registrations
              </h2>

              {isLoading ? (
                <div className="flex justify-center py-16">
                  <span className="loading loading-spinner loading-lg text-primary" />
                </div>
              ) : assets.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-base-300 p-16 text-center bg-base-100/50 italic text-base-content/40">
                  You haven&apos;t registered any assets yet.
                  <button
                    onClick={() => setIsRegisterModalOpen(true)}
                    className="text-primary hover:underline ml-1 not-italic font-bold"
                  >
                    Start here.
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {assets.map(asset => (
                    <div
                      key={asset.asset_id}
                      className="rounded-3xl border border-base-300 bg-base-100/40 backdrop-blur-md p-6 md:p-8 shadow-xl shadow-primary/5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/50 transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 group-hover:bg-primary/10 transition-colors">
                          <BuildingOffice2Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-bold text-lg text-base-content">{asset.asset_name}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs font-mono text-base-content/40 uppercase tracking-wider">
                              {asset.asset_code} · Valuation: {(Number(asset.valuation) / 1e7).toLocaleString()} USDC
                            </span>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <span
                              className={`badge badge-sm font-bold uppercase tracking-widest ${
                                (asset.state?.tag || asset.state) === "Pending"
                                  ? "badge-warning"
                                  : (asset.state?.tag || asset.state) === "Active"
                                    ? "badge-success"
                                    : "badge-primary"
                              }`}
                            >
                              {asset.state?.tag || asset.state}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {(asset.state?.tag || asset.state) === "Pending" && (
                          <div className="alert alert-warning py-2 text-[10px] font-bold uppercase tracking-widest border-warning/20 bg-warning/5 rounded-xl">
                            Waiting for Admin Approval
                          </div>
                        )}
                        {(asset.state?.tag || asset.state) === "Active" && (
                          <div
                            className={`alert ${asset.model?.tag === "WholeOwnership" ? "alert-info" : "alert-success"} py-2 text-[10px] font-bold uppercase tracking-widest border-current/20 bg-current/5 rounded-xl`}
                          >
                            {asset.model?.tag === "WholeOwnership" ? "Listed on Marketplace" : "Ready for Tokenization"}
                          </div>
                        )}
                        {(asset.state?.tag || asset.state) === "Tokenized" && (
                          <Link href="/marketplace" className="btn btn-primary btn-outline btn-sm gap-2 rounded-xl">
                            View in Marketplace <ArrowRightIcon className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tips Section */}
            <div className="rounded-[2.5rem] bg-primary/5 p-10 border border-primary/10 flex flex-col md:flex-row items-center gap-8 shadow-2xl shadow-primary/5">
              <div className="h-20 w-20 rounded-3xl bg-base-100 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-xl">
                <DocumentTextIcon className="h-10 w-10" />
              </div>
              <div>
                <h3 className="font-black text-2xl mb-1 uppercase tracking-tight">Stellar Compliance First</h3>
                <p className="text-sm text-base-content/60 max-w-xl leading-relaxed">
                  Vaultic utilizes precision-engineered Soroban smart contracts to ensure every RWA meets global
                  regulatory standards. Assets are audited before transitioning into Stellar native primitives, securing
                  institutional-grade liquidity.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Registration Modal */}
      {isRegisterModalOpen && publicKey && (
        <RegisterModal
          publicKey={publicKey}
          onClose={() => setIsRegisterModalOpen(false)}
          onSuccess={async () => {
            setIsRegisterModalOpen(false);
            await loadOwnerAssets();
          }}
        />
      )}
    </div>
  );
}
