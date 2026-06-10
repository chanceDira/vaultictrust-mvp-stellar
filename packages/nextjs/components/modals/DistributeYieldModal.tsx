"use client";

import { useRef, useState } from "react";
import { BanknotesIcon, CurrencyDollarIcon, RocketLaunchIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { getExplorerTxUrl } from "~~/scaffold.config";
import { depositYield, getContractIds, increaseAllowance } from "~~/services/stellar/sorobanService";
import { OnChainAsset } from "~~/types/stellar";
import { notification } from "~~/utils/vaultic";

interface DistributeYieldModalProps {
  asset: OnChainAsset;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  publicKey: string;
}

export function DistributeYieldModal({ asset, isOpen, onClose, onSuccess, publicKey }: DistributeYieldModalProps) {
  const [usdcAmount, setUsdcAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const isSubmitting = useRef(false);

  const handleDistribute = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!usdcAmount || isNaN(Number(usdcAmount)) || Number(usdcAmount) <= 0 || isProcessing || isSubmitting.current) {
      if (!usdcAmount || isNaN(Number(usdcAmount)) || Number(usdcAmount) <= 0) {
        notification.error("Please enter a valid USDC amount");
      }
      return;
    }

    isSubmitting.current = true;
    setIsProcessing(true);
    const id = notification.loading(`Preparing yield distribution for ${asset.asset_name}...`);

    try {
      const amountBigInt = BigInt(Math.round(parseFloat(usdcAmount) * 1e7));
      const { dividendManager } = getContractIds();

      if (!dividendManager) throw new Error("Dividend Manager not deployed");

      await increaseAllowance(amountBigInt, publicKey, dividendManager);

      const { hash } = await depositYield(
        {
          assetId: asset.asset_id,
          amount: amountBigInt,
          totalSharesOutstanding: asset.total_shares,
        },
        publicKey,
      );

      notification.success(
        <div className="flex flex-col gap-1">
          <p className="font-bold">Yield Distributed!</p>
          <a
            href={getExplorerTxUrl(hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-primary hover:underline flex items-center gap-1"
          >
            View on Explorer <RocketLaunchIcon className="h-3 w-3" />
          </a>
        </div>,
      );
      onSuccess();
    } catch (e: any) {
      console.error("[DistributeYield] Error:", e);
      notification.error(`Distribution failed: ${e.message || "Network error"}`);
    } finally {
      setIsProcessing(false);
      isSubmitting.current = false;
      notification.remove(id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-base-100 border border-base-300 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-base-200/50 p-6 border-b border-base-300 flex justify-between items-center text-error">
          <div>
            <h2 className="text-xl font-semibold">Distribute yield</h2>
            <p className="text-sm text-base-content/50">
              {asset.asset_name} · {asset.asset_code}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle" disabled={isProcessing}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-2xl border border-primary/10">
            <CurrencyDollarIcon className="h-8 w-8 text-primary shrink-0" />
            <p className="text-[10px] text-primary/70 leading-relaxed font-medium">
              Funding this round will distribute USDC to all current fractional holders of {asset.asset_code} based on
              their ownership percentage.
            </p>
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-bold uppercase tracking-widest text-[10px] opacity-50">
                Total USDC Amount to Distribute
              </span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                placeholder="100.00"
                className="input input-bordered w-full rounded-2xl pl-10 font-bold text-lg"
                value={usdcAmount}
                onChange={e => setUsdcAmount(e.target.value)}
                disabled={isProcessing}
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black opacity-30">$</div>
            </div>
          </div>

          <div className="bg-base-200/50 rounded-2xl p-6 border border-base-300">
            <div className="flex justify-between items-center text-xs">
              <span className="opacity-50 font-bold uppercase tracking-widest">Snapshot Shares</span>
              <span className="font-mono font-bold">{Number(asset.total_shares).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              className="btn btn-ghost flex-1 rounded-2xl font-bold uppercase tracking-widest text-[10px]"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary flex-[2] gap-3 rounded-2xl shadow-lg shadow-primary/20"
              onClick={handleDistribute}
              disabled={isProcessing || !usdcAmount}
            >
              {isProcessing ? (
                <span className="loading loading-bars loading-xs" />
              ) : (
                <>
                  Confirm Payout
                  <BanknotesIcon className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
