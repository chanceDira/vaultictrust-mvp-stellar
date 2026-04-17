"use client";

import { useState } from "react";
import { CheckCircleIcon, CubeIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

const ASSET_STATE_PENDING = 0;
const ASSET_STATE_ACTIVE = 1;
const MODEL_FRACTIONAL = 1;
const PAYMENT_TOKEN_DECIMALS = 6;

type AssetOverride = { state: number; model: number; valuation: bigint };

type TokenizationActionsProps = {
  assetId: bigint;
  isRegistryOwner: boolean;
  isInvestmentManagerOwner: boolean;
  /** When provided, skip getAsset read (e.g. from parent AssetCard). */
  assetOverride?: AssetOverride;
};

export function TokenizationActions({
  assetId,
  isRegistryOwner,
  isInvestmentManagerOwner,
  assetOverride,
}: TokenizationActionsProps) {
  const { data: asset, isLoading } = useScaffoldReadContract({
    contractName: "VaulticAssetRegistry",
    functionName: "getAsset",
    args: [assetId],
  });

  const { writeContractAsync: writeApprove, isMining: isApproveMining } = useScaffoldWriteContract({
    contractName: "VaulticAssetRegistry",
  });
  const { writeContractAsync: writeTokenize, isMining: isTokenizeMining } = useScaffoldWriteContract({
    contractName: "VaulticInvestmentManager",
  });

  const [totalShares, setTotalShares] = useState("");
  const [pricePerShare, setPricePerShare] = useState("");
  const [investorCap, setInvestorCap] = useState("0");

  if (isLoading || !asset) return null;

  const raw = Array.isArray(asset) ? asset[0] : asset;
  const rec = raw as { state: number; model: number; valuation: bigint; assetName: string };
  const state = assetOverride?.state ?? rec.state;
  const model = assetOverride?.model ?? rec.model;

  const showApprove = state === ASSET_STATE_PENDING;
  const showTokenize = state === ASSET_STATE_ACTIVE && model === MODEL_FRACTIONAL;

  if (!showApprove && !showTokenize) return null;

  const handleApprove = async () => {
    try {
      await writeApprove({ functionName: "approveAsset", args: [assetId] });
      notification.success("Asset approved");
    } catch (e: unknown) {
      console.error(e);
      notification.error(getParsedError(e) || "Approve failed.");
    }
  };

  const handleTokenize = async (e: React.FormEvent) => {
    e.preventDefault();
    const shares = totalShares.replace(/,/g, "");
    const price = pricePerShare.replace(/,/g, "");
    const cap = investorCap.replace(/,/g, "");
    const totalSharesNum = shares ? Math.max(0, Math.floor(Number(shares))) : 0;
    const priceNum = price ? Math.max(0, parseFloat(price)) : 0;
    const capNum = cap ? Math.max(0, Math.floor(Number(cap))) : 0;

    if (totalSharesNum <= 0) {
      notification.error("Enter a positive total shares");
      return;
    }
    if (priceNum <= 0) {
      notification.error("Enter a positive price per share");
      return;
    }

    const pricePerShareWei = BigInt(Math.round(priceNum * 10 ** PAYMENT_TOKEN_DECIMALS));
    try {
      await writeTokenize({
        functionName: "tokenizeAsset",
        args: [assetId, BigInt(totalSharesNum), pricePerShareWei, BigInt(capNum)],
      });
      notification.success("Asset tokenized");
      setTotalShares("");
      setPricePerShare("");
      setInvestorCap("0");
    } catch (e: unknown) {
      console.error(e);
      notification.error(getParsedError(e) || "Tokenization failed.");
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <h4 className="font-semibold text-base-content flex items-center gap-2">
        <CubeIcon className="h-4 w-4 text-primary" />
        Tokenization
      </h4>

      {showApprove && (
        <div className="mt-3">
          <p className="text-sm text-base-content/70 mb-2">
            This asset is pending. Approve it so it can be tokenized and opened for investment.
          </p>
          {!isRegistryOwner && (
            <p className="text-xs text-warning mb-2">Only the registry owner can approve. Connect with that wallet.</p>
          )}
          <button
            type="button"
            className="btn btn-primary btn-sm gap-2"
            disabled={isApproveMining || !isRegistryOwner}
            onClick={handleApprove}
          >
            <CheckCircleIcon className="h-4 w-4" />
            {isApproveMining ? "Confirming..." : "Approve asset"}
          </button>
        </div>
      )}

      {showTokenize && (
        <form onSubmit={handleTokenize} className="mt-3 space-y-3">
          <p className="text-sm text-base-content/70">
            Deploy a fractional token and open this asset for investment. Price is in payment token units (6 decimals).
          </p>
          {!isInvestmentManagerOwner && (
            <p className="text-xs text-warning">
              Only the investment manager owner can tokenize. Connect with that wallet.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-base-content/70">Total shares</label>
              <input
                type="text"
                inputMode="numeric"
                value={totalShares}
                onChange={e => setTotalShares(e.target.value)}
                placeholder="e.g. 1000"
                className="input input-bordered input-sm w-full mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-base-content/70">Price per share</label>
              <input
                type="text"
                inputMode="decimal"
                value={pricePerShare}
                onChange={e => setPricePerShare(e.target.value)}
                placeholder="e.g. 1.50"
                className="input input-bordered input-sm w-full mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-base-content/70">Investor cap (0 = none)</label>
              <input
                type="text"
                inputMode="numeric"
                value={investorCap}
                onChange={e => setInvestorCap(e.target.value)}
                placeholder="0"
                className="input input-bordered input-sm w-full mt-1"
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={
              isTokenizeMining ||
              !isInvestmentManagerOwner ||
              !totalShares ||
              !pricePerShare ||
              Number(totalShares) <= 0 ||
              Number(pricePerShare) <= 0
            }
          >
            {isTokenizeMining ? "Tokenizing..." : "Tokenize asset"}
          </button>
        </form>
      )}
    </div>
  );
}
