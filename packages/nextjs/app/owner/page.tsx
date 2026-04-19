"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  PlusIcon,
  SparklesIcon,
  WalletIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { uploadMetadataToIPFS } from "~~/services/stellar/ipfsService";
import { fetchAsset, fetchAssetsByOwner, getContractIds, registerAsset } from "~~/services/stellar/sorobanService";
import { notification } from "~~/utils/scaffold-eth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AssetStateKey = "Pending" | "Active" | "Tokenized" | "Closed" | "Relisted";

interface OnChainAsset {
  asset_id: number;
  asset_name: string;
  asset_category: string;
  asset_code: string;
  asset_owner: string;
  state: { tag: AssetStateKey };
  valuation: bigint;
  metadata_uri: string;
}

// ---------------------------------------------------------------------------
// Register Modal
// ---------------------------------------------------------------------------

function RegisterModal({
  onClose,
  onSuccess,
  publicKey,
}: {
  onClose: () => void;
  onSuccess: () => void;
  publicKey: string;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Real Estate");
  const [code, setCode] = useState("VT...");
  const [valuation, setValuation] = useState("10000000"); // 1 USDC in stroops? No, valuation is i128 raw.
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !code || !valuation) {
      notification.error("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    const id = notification.loading(`Uploading metadata and registering ${name}...`);
    try {
      // 1. Upload metadata to IPFS
      const metadataResult = await uploadMetadataToIPFS({
        name,
        description,
        category,
        valuation: Number(valuation) / 1e7,
        currency: "USDC",
        assetCode: code,
        createdAt: new Date().toISOString(),
        platform: "Vaultic Trust v1",
      });

      // 2. Transact with Soroban
      await registerAsset(
        {
          assetOwner: publicKey,
          assetName: name,
          assetCategory: category,
          assetCode: code,
          metadataUri: metadataResult.uri,
          valuation: BigInt(valuation),
          model: "Fractional", // Default for now
        },
        publicKey,
      );

      notification.success(`${name} registered in Vaultic Registry!`);
      onSuccess();
    } catch (e: any) {
      notification.error(`Registration failed: ${e.message}`);
    } finally {
      setLoading(false);
      notification.remove(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-base-100 border border-base-300 rounded-3xl w-full max-w-xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold">Register RWA</h2>
            <p className="text-sm text-base-content/50">Submit an African asset for Vaultic verification.</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <label className="form-control w-full">
            <span className="label-text font-bold text-xs uppercase tracking-widest text-base-content/40 mb-1">
              Asset Name
            </span>
            <input
              className="input input-bordered"
              placeholder="e.g. Kigali Green Tower"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text font-bold text-xs uppercase tracking-widest text-base-content/40 mb-1">
              Asset Code (Ticker)
            </span>
            <input
              className="input input-bordered font-mono"
              placeholder="VTKGT"
              value={code}
              onChange={e => setCode(e.target.value)}
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text font-bold text-xs uppercase tracking-widest text-base-content/40 mb-1">
              Category
            </span>
            <select className="select select-bordered" value={category} onChange={e => setCategory(e.target.value)}>
              <option>Real Estate</option>
              <option>Mining</option>
              <option>Agriculture</option>
              <option>Infrastructure</option>
              <option>Commodities</option>
            </select>
          </label>
          <label className="form-control w-full">
            <span className="label-text font-bold text-xs uppercase tracking-widest text-base-content/40 mb-1">
              Valuation (USDC stroops)
            </span>
            <input
              className="input input-bordered"
              type="number"
              value={valuation}
              onChange={e => setValuation(e.target.value)}
            />
          </label>
        </div>

        <label className="form-control w-full mt-4">
          <span className="label-text font-bold text-xs uppercase tracking-widest text-base-content/40 mb-1">
            Description & Location
          </span>
          <textarea
            className="textarea textarea-bordered h-24"
            placeholder="Briefly describe the asset and its location in Africa..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </label>

        <div className="alert alert-info bg-blue-500/5 mt-6 border-blue-500/20">
          <InformationCircleIcon className="h-4 w-4 shrink-0" />
          <span className="text-[10px] uppercase font-bold tracking-widest">
            Metadata will be pinned to IPFS for transparency.
          </span>
        </div>

        <div className="flex gap-4 mt-8">
          <button className="btn btn-ghost flex-1 rounded-xl" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-primary flex-1 rounded-xl gap-2" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="loading loading-spinner" /> : <CheckCircleIcon className="h-5 w-5" />}
            Submit Listing
          </button>
        </div>
      </div>
    </div>
  );
}

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
    <div className="flex flex-col grow bg-base-200/20 min-h-screen">
      <section className="px-4 py-8 md:py-12 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <BuildingOffice2Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-base-content uppercase tracking-tight">Owner Dashboard</h1>
            <p className="text-xs text-base-content/50 uppercase tracking-widest font-semibold">
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
                className="btn btn-primary btn-md rounded-2xl gap-2 px-6 shadow-lg shadow-primary/20 w-full md:w-auto"
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
                      className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/30 transition-all group"
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
                                asset.state.tag === "Pending"
                                  ? "badge-warning"
                                  : asset.state.tag === "Active"
                                    ? "badge-success"
                                    : "badge-primary"
                              }`}
                            >
                              {asset.state.tag}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {asset.state.tag === "Pending" && (
                          <div className="alert alert-warning py-2 text-[10px] font-bold uppercase tracking-widest border-warning/20 bg-warning/5 rounded-xl">
                            Waiting for Admin Approval
                          </div>
                        )}
                        {asset.state.tag === "Active" && (
                          <div className="alert alert-success py-2 text-[10px] font-bold uppercase tracking-widest border-success/20 bg-success/5 rounded-xl">
                            Ready for Tokenization
                          </div>
                        )}
                        {asset.state.tag === "Tokenized" && (
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
            <div className="rounded-3xl bg-base-300/30 p-8 border border-base-300/50 flex flex-col md:flex-row items-center gap-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/10">
                <DocumentTextIcon className="h-8 w-8" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-1">Stellar Compliance First</h3>
                <p className="text-sm text-base-content/60 max-w-xl">
                  Vaultic uses Soroban smart contracts to ensure that every RWA submitted meets regulatory standards
                  before it can be tokenized into Stellar native primitives. This protects both owners and investors.
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
