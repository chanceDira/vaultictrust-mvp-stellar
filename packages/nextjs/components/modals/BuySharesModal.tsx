"use client";

import { useEffect, useRef, useState } from "react";
import { BanknotesIcon, RocketLaunchIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { PROTOCOL_METADATA } from "~~/scaffold.config";
import { fetchQuotePurchase, purchaseShares } from "~~/services/stellar/sorobanService";
import { OnChainAsset } from "~~/types/stellar";
import { notification } from "~~/utils/scaffold-eth";

interface BuySharesModalProps {
  asset: OnChainAsset;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  publicKey: string;
}

export function BuySharesModal({ asset, isOpen, onClose, onSuccess, publicKey }: BuySharesModalProps) {
  const [sharesAmount, setSharesAmount] = useState<string>("1");
  const [isQuoting, setIsQuoting] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const isSubmitting = useRef(false);
  const [quote, setQuote] = useState<{ gross: bigint; fee: bigint; net: bigint } | null>(null);

  useEffect(() => {
    if (!sharesAmount || isNaN(Number(sharesAmount)) || Number(sharesAmount) <= 0) {
      setQuote(null);
      return;
    }

    const getQuote = async () => {
      setIsQuoting(true);
      try {
        const q = await fetchQuotePurchase(asset.asset_id, BigInt(sharesAmount));
        setQuote(q);
      } catch (e) {
        console.error("[BuySharesModal] Quote error:", e);
      } finally {
        setIsQuoting(false);
      }
    };

    const timer = setTimeout(getQuote, 400);
    return () => clearTimeout(timer);
  }, [sharesAmount, asset.asset_id]);

  const handlePurchase = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!sharesAmount || isNaN(Number(sharesAmount)) || isPurchasing || isSubmitting.current) return;

    isSubmitting.current = true;
    setIsPurchasing(true);
    const id = notification.loading(`Processing investment in ${asset.asset_name}...`);
    try {
      const { hash } = await purchaseShares(
        {
          investor: publicKey,
          assetId: asset.asset_id,
          shareAmount: BigInt(sharesAmount),
        },
        publicKey,
      );

      notification.success(
        <div className="flex flex-col gap-1">
          <p className="font-bold">Investment Successful!</p>
          <a
            href={PROTOCOL_METADATA.EXPLORER_TX_URL(hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-primary hover:underline flex items-center gap-1"
          >
            View on Explorer <RocketLaunchIcon className="h-3 w-3" />
          </a>
        </div>,
      );

      // Clear the modal state before calling onSuccess to prevent any re-clicks
      onSuccess();
    } catch (e: any) {
      console.error("[BuySharesModal] Purchase error:", e);
      notification.error(`Investment failed: ${e.message || "Network execution error"}`);
      setIsPurchasing(false); // Only allow re-attempts if it actually failed
    } finally {
      setIsPurchasing(false);
      isSubmitting.current = false;
      notification.remove(id);
    }
  };

  if (!isOpen) return null;

  const grossUsdc = quote ? Number(quote.gross) / 1e7 : 0;
  const feeUsdc = quote ? Number(quote.fee) / 1e7 : 0;
  const totalUsdc = grossUsdc;

  const availableShares = Number(asset.total_shares - asset.sold_shares);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-base-100 border border-base-300 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-base-200/50 p-6 border-b border-base-300 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter italic">Invest</h2>
            <p className="text-[10px] text-base-content/40 uppercase tracking-widest font-bold">
              {asset.asset_name} · {asset.asset_code}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle" disabled={isPurchasing}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-bold uppercase tracking-widest text-[10px] opacity-50">
                Number of Shares
              </span>
              <span className="label-text-alt font-bold text-primary italic text-[10px]">
                {availableShares.toLocaleString()} Available
              </span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max={availableShares.toString()}
                placeholder="1"
                className="input input-bordered w-full rounded-2xl pr-16 font-bold text-lg"
                value={sharesAmount}
                onChange={e => setSharesAmount(e.target.value)}
                disabled={isPurchasing}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest opacity-30">
                Shares
              </div>
            </div>
          </div>

          <div className="bg-base-200/50 rounded-2xl p-6 border border-base-300 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="opacity-50 font-bold uppercase tracking-widest">Price per Share</span>
              <span className="font-mono">{(Number(asset.price_per_share) / 1e7).toFixed(2)} USDC</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="opacity-50 font-bold uppercase tracking-widest">Protocol Fee</span>
              <span className="font-mono text-warning">{isQuoting ? "..." : `${feeUsdc.toFixed(2)} USDC`}</span>
            </div>

            <div className="h-px bg-base-300 my-1" />

            <div className="flex justify-between items-center">
              <span className="text-sm font-black uppercase tracking-tighter italic">Total Cost</span>
              <span className="text-xl font-black text-primary">
                {isQuoting ? (
                  <span className="loading loading-dots loading-sm" />
                ) : (
                  `$${totalUsdc.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                )}
                <span className="text-[10px] ml-1 opacity-50 not-italic">USDC</span>
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-primary/5 p-4 rounded-xl border border-primary/10">
            <BanknotesIcon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[10px] text-primary/70 leading-relaxed font-medium capitalize">
              Your investment will be processed on-chain. ensure you have established a trustline for both USDC and{" "}
              {asset.asset_code} before proceeding.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              className="btn btn-ghost flex-1 rounded-2xl font-bold uppercase tracking-widest text-[10px]"
              onClick={onClose}
              disabled={isPurchasing}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary flex-[2] rounded-2xl gap-3 shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-xs"
              onClick={handlePurchase}
              disabled={isPurchasing || isQuoting || !quote || Number(sharesAmount) > availableShares}
            >
              {isPurchasing ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <>
                  Confirm Purchase
                  <RocketLaunchIcon className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
