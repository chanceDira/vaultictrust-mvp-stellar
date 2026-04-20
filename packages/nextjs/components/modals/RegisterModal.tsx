"use client";

import { useState } from "react";
import { CheckCircleIcon, InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { uploadMetadataToIPFS } from "~~/services/stellar/ipfsService";
import { registerAsset } from "~~/services/stellar/sorobanService";
import { notification } from "~~/utils/scaffold-eth";

export function RegisterModal({
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
  const [code, setCode] = useState("");
  // Human-readable USDC amount (e.g. "50000" means $50,000 USDC)
  const [valuationUsdc, setValuationUsdc] = useState("");
  const [description, setDescription] = useState("");
  const [model, setModel] = useState<"Fractional" | "WholeOwnership">("Fractional");
  const [loading, setLoading] = useState(false);

  // Convert real USDC → stroops for the contract (1 USDC = 10_000_000 stroops)
  const usdcToStroops = (usdc: string): bigint => {
    const parsed = parseFloat(usdc);
    if (isNaN(parsed) || parsed <= 0) return 0n;
    return BigInt(Math.round(parsed * 1e7));
  };

  const valuationStroops = usdcToStroops(valuationUsdc);
  const valuationDisplay = parseFloat(valuationUsdc || "0").toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const handleSubmit = async () => {
    if (!name.trim()) {
      notification.error("Asset name is required.");
      return;
    }
    if (!code.trim()) {
      notification.error("Asset ticker code is required.");
      return;
    }
    if (valuationStroops <= 0n) {
      notification.error("Please enter a valid asset valuation greater than 0.");
      return;
    }

    setLoading(true);
    const id = notification.loading(`Uploading metadata and registering ${name}...`);
    try {
      // 1. Upload metadata to IPFS (store human-readable USDC value)
      const metadataResult = await uploadMetadataToIPFS({
        name,
        description,
        category,
        valuation: parseFloat(valuationUsdc), // real USDC, not stroops
        currency: "USDC",
        assetCode: code.toUpperCase(),
        createdAt: new Date().toISOString(),
        platform: "Vaultic Trust v1",
      });

      // 2. Transact with Soroban (pass stroops to the contract)
      await registerAsset(
        {
          assetOwner: publicKey,
          assetName: name,
          assetCategory: category,
          assetCode: code.toUpperCase(),
          metadataUri: metadataResult.uri,
          valuation: valuationStroops,
          model: model,
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
      <div className="bg-base-100 border border-base-300 rounded-3xl w-full max-w-3xl shadow-2xl overflow-y-auto max-h-[95vh]">
        {/* Header */}
        <div className="flex justify-between items-start p-8 pb-6 border-b border-base-300">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter italic">Register RWA</h2>
            <p className="text-[10px] text-base-content/40 uppercase tracking-[0.2em] font-bold mt-1">
              Submit for Compliance Review
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm ml-4 shrink-0">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Asset Name */}
          <div className="form-control w-full">
            <label className="label pb-1">
              <span className="label-text font-semibold">
                Asset Name <span className="text-error">*</span>
              </span>
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="e.g. Kigali Green Tower, Lagos Farmland Plot A"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={loading}
            />
            <label className="label pt-1">
              <span className="label-text-alt text-base-content/40">
                The full legal or commercial name of the asset
              </span>
            </label>
          </div>

          {/* Ticker + Category row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control w-full">
              <label className="label pb-1">
                <span className="label-text font-semibold">
                  Ticker Code <span className="text-error">*</span>
                </span>
              </label>
              <input
                className="input input-bordered font-mono uppercase w-full"
                placeholder="e.g. VTLGF"
                maxLength={12}
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                disabled={loading}
              />
              <label className="label pt-1">
                <span className="label-text-alt text-base-content/40">Short identifier (max 12 chars)</span>
              </label>
            </div>
            <div className="form-control w-full">
              <label className="label pb-1">
                <span className="label-text font-semibold">Category</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={category}
                onChange={e => setCategory(e.target.value)}
                disabled={loading}
              >
                <option>Real Estate</option>
                <option>Mining</option>
                <option>Agriculture</option>
                <option>Infrastructure</option>
                <option>Commodities</option>
              </select>
            </div>
          </div>

          {/* Valuation */}
          <div className="form-control w-full">
            <label className="label pb-1">
              <span className="label-text font-semibold">
                Asset Valuation <span className="text-error">*</span>
              </span>
              <span className="label-text-alt text-base-content/40">in USDC</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/50 font-semibold pointer-events-none">
                $
              </span>
              <input
                className="input input-bordered w-full pl-8"
                type="number"
                min="1"
                step="any"
                placeholder="50000"
                value={valuationUsdc}
                onChange={e => setValuationUsdc(e.target.value)}
                disabled={loading}
              />
            </div>
            <label className="label pt-1">
              <span className="label-text-alt text-base-content/40">Estimated total market value of the asset</span>
              {valuationStroops > 0n && (
                <span className="label-text-alt text-primary font-semibold">= {valuationDisplay} USDC</span>
              )}
            </label>
          </div>

          {/* Description */}
          <div className="form-control w-full">
            <label className="label pb-1">
              <span className="label-text font-semibold">Description & Location</span>
              <span className="label-text-alt text-base-content/40">optional</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-24 w-full resize-none"
              placeholder="Briefly describe the asset and its location in Africa — e.g. 'Commercial plot in Nairobi CBD, 0.5 acres, freehold title'"
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Ownership Model */}
          <div className="form-control w-full">
            <label className="label pb-1">
              <span className="label-text font-semibold">Ownership Model</span>
            </label>
            <div className="flex gap-4">
              <div
                className={`flex-1 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  model === "Fractional"
                    ? "border-primary bg-primary/5 shadow-inner"
                    : "border-base-300 hover:border-base-content/10"
                }`}
                onClick={() => !loading && setModel("Fractional")}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-3 h-3 rounded-full ${model === "Fractional" ? "bg-primary shadow-[0_0_8px] shadow-primary" : "bg-base-300"}`}
                  />
                  <span className="font-black uppercase tracking-widest text-[10px]">Fractional</span>
                </div>
                <p className="text-[10px] text-base-content/50 leading-tight">
                  Asset is split into shares for multiple investors to pool funds.
                </p>
              </div>

              <div
                className={`flex-1 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  model === "WholeOwnership"
                    ? "border-primary bg-primary/5 shadow-inner"
                    : "border-base-300 hover:border-base-content/10"
                }`}
                onClick={() => !loading && setModel("WholeOwnership")}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-3 h-3 rounded-full ${model === "WholeOwnership" ? "bg-primary shadow-[0_0_8px] shadow-primary" : "bg-base-300"}`}
                  />
                  <span className="font-black uppercase tracking-widest text-[10px]">Whole Asset</span>
                </div>
                <p className="text-[10px] text-base-content/50 leading-tight">
                  The entire asset is purchased by a single investor at full valuation.
                </p>
              </div>
            </div>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15 text-sm">
            <InformationCircleIcon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="text-base-content/60 text-xs leading-relaxed">
              <span className="font-semibold text-base-content/80">After submission</span>, Vaultic admins will review
              and approve your asset before it becomes available for investment. Asset metadata will be permanently
              pinned to IPFS.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-4 p-8 pt-4">
          <button
            className="btn btn-ghost flex-1 rounded-2xl font-black uppercase tracking-widest text-[10px]"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary flex-1 rounded-2xl gap-3 stellar-glow shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-[10px]"
            onClick={handleSubmit}
            disabled={loading || valuationStroops <= 0n || !name.trim() || !code.trim()}
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <CheckCircleIcon className="h-5 w-5" />
            )}
            Register Asset
          </button>
        </div>
      </div>
    </div>
  );
}
