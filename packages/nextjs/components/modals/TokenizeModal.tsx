"use client";

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { tokenizeAsset } from "~~/services/stellar/sorobanService";
import { OnChainAsset } from "~~/types/stellar";
import { notification } from "~~/utils/scaffold-eth";

export function TokenizeModal({
  asset,
  onClose,
  onSuccess,
  publicKey,
}: Readonly<{
  asset: OnChainAsset;
  onClose: () => void;
  onSuccess: () => void;
  publicKey: string;
}>) {
  const [totalShares, setTotalShares] = useState("10000");
  // Human-readable USDC price per share (e.g. "5" = $5 USDC per share)
  const [priceUsdc, setPriceUsdc] = useState("");
  const [investorCap, setInvestorCap] = useState("0");
  const [rwaIssuer, setRwaIssuer] = useState("");
  const [loading, setLoading] = useState(false);

  // Convert real USDC → stroops (1 USDC = 10_000_000 stroops)
  const usdcToStroops = (usdc: string): bigint => {
    const parsed = parseFloat(usdc);
    if (isNaN(parsed) || parsed <= 0) return 0n;
    return BigInt(Math.round(parsed * 1e7));
  };

  const priceStroops = usdcToStroops(priceUsdc);
  const totalSharesNum = parseInt(totalShares) || 0;
  const totalPoolUsdc = (parseFloat(priceUsdc) || 0) * totalSharesNum;

  // Asset valuation from registration (stored as stroops)
  const registrationValuationUsdc = asset.valuation ? Number(asset.valuation) / 1e7 : 0;

  const handleSubmit = async () => {
    if (!rwaIssuer.trim()) {
      notification.error("RWA Issuer address is required");
      return;
    }
    if (priceStroops <= 0n) {
      notification.error("Please enter a valid price per share greater than 0");
      return;
    }
    if (totalSharesNum <= 0) {
      notification.error("Total shares must be greater than 0");
      return;
    }
    setLoading(true);
    const id = notification.loading(`Tokenizing ${asset.asset_name}...`);
    try {
      await tokenizeAsset(
        {
          assetId: asset.asset_id,
          totalShares: BigInt(totalShares),
          pricePerShare: priceStroops,
          investorCap: BigInt(investorCap || "0"),
          rwaIssuer,
          rwaAssetCode: asset.asset_code,
        },
        publicKey,
      );
      notification.success(`${asset.asset_name} tokenized on Stellar!`);
      onSuccess();
    } catch (e: any) {
      notification.error(`Tokenization failed: ${e.message || "Unknown error"}`);
    } finally {
      setLoading(false);
      notification.remove(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-base-100 border border-base-300 rounded-2xl w-full max-w-3xl shadow-2xl overflow-y-auto max-h-[95vh]">
        {/* Header */}
        <div className="flex justify-between items-start p-8 pb-6 border-b border-base-300">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter italic">Tokenize Asset</h2>
            <p className="text-[10px] text-base-content/40 uppercase tracking-[0.2em] font-bold mt-1">
              Initiate RWA Fractionalization
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm ml-4 shrink-0" disabled={loading}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Locked: Asset info from registration */}
          <div className="rounded-xl bg-base-200/60 border border-base-300 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-base-content/40 mb-2">
              Registered Asset Details
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-base-content/40 uppercase tracking-widest">Asset Name</p>
                <p className="font-semibold text-sm mt-0.5">{asset.asset_name}</p>
              </div>
              <div>
                <p className="text-xs text-base-content/40 uppercase tracking-widest">Ticker</p>
                <p className="font-semibold font-mono text-sm mt-0.5">{asset.asset_code}</p>
              </div>
              <div>
                <p className="text-xs text-base-content/40 uppercase tracking-widest">Category</p>
                <p className="font-semibold text-sm mt-0.5">{asset.asset_category ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-base-content/40 uppercase tracking-widest">Registered Valuation</p>
                <p className="font-semibold text-sm mt-0.5 text-primary">
                  {registrationValuationUsdc > 0 ? `$${registrationValuationUsdc.toLocaleString()} USDC` : "—"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-base-content/40 uppercase tracking-widest">Asset Owner</p>
              <p className="font-mono text-xs mt-0.5 text-base-content/70 break-all">{asset.asset_owner}</p>
            </div>
          </div>

          {/* Editable: Tokenization parameters */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control w-full">
              <label className="label pb-1">
                <span className="label-text font-black uppercase tracking-widest text-[10px]">
                  Total Shares <span className="text-error">*</span>
                </span>
              </label>
              <input
                className="input input-bordered w-full rounded-xl"
                type="number"
                min="1"
                placeholder="10000"
                value={totalShares}
                onChange={e => setTotalShares(e.target.value)}
                disabled={loading}
              />
              <label className="label pt-1">
                <span className="label-text-alt text-base-content/40 uppercase font-bold text-[9px]">
                  Units to issue
                </span>
              </label>
            </div>
            <div className="form-control w-full">
              <label className="label pb-1">
                <span className="label-text font-black uppercase tracking-widest text-[10px]">
                  Price per Share <span className="text-error">*</span>
                </span>
                <span className="label-text-alt text-base-content/40 font-bold uppercase text-[9px]">USDC</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/50 font-black pointer-events-none text-xs">
                  $
                </span>
                <input
                  className="input input-bordered w-full pl-8 rounded-xl"
                  type="number"
                  min="0.0000001"
                  step="any"
                  placeholder="5.00"
                  value={priceUsdc}
                  onChange={e => setPriceUsdc(e.target.value)}
                  disabled={loading}
                />
              </div>
              <label className="label pt-1">
                <span className="label-text-alt text-base-content/40 uppercase font-bold text-[9px]">
                  Cost per unit
                </span>
              </label>
            </div>
          </div>

          {/* Pool value preview */}
          {totalPoolUsdc > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-success/5 border border-success/20">
              <span className="text-xs font-semibold text-base-content/60 uppercase tracking-widest">
                Total Pool Value
              </span>
              <span className="font-bold text-success">
                ${totalPoolUsdc.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
              </span>
            </div>
          )}

          {/* Investor cap */}
          <div className="form-control w-full">
            <label className="label pb-1">
              <span className="label-text font-semibold">Max Shares per Investor</span>
              <span className="label-text-alt text-base-content/40">0 = no limit</span>
            </label>
            <input
              className="input input-bordered w-full"
              type="number"
              min="0"
              placeholder="0 (uncapped)"
              value={investorCap === "0" ? "" : investorCap}
              onChange={e => setInvestorCap(e.target.value || "0")}
              disabled={loading}
            />
            <label className="label pt-1">
              <span className="label-text-alt text-base-content/40">
                Maximum number of shares a single investor can hold. Leave blank for no limit.
              </span>
            </label>
          </div>

          {/* RWA Issuer */}
          <div className="form-control w-full">
            <label className="label pb-1">
              <span className="label-text font-semibold">
                RWA Native Asset Issuer <span className="text-error">*</span>
              </span>
            </label>
            <input
              className="input input-bordered w-full font-mono text-sm"
              placeholder="G... (Stellar address)"
              value={rwaIssuer}
              onChange={e => setRwaIssuer(e.target.value)}
              disabled={loading}
            />
            <label className="label pt-1">
              <span className="label-text-alt text-base-content/40">
                The Stellar account that will issue and distribute native{" "}
                <span className="font-mono">{asset.asset_code}</span> tokens to investors
              </span>
            </label>
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
            disabled={loading || priceStroops <= 0n || totalSharesNum <= 0 || !rwaIssuer.trim()}
          >
            {loading ? <span className="loading loading-spinner loading-sm" /> : "Tokenize Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
