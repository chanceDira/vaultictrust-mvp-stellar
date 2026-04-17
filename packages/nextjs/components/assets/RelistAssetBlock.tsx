"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useReadContract } from "wagmi";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useDeployedContractInfo, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

const PAYMENT_TOKEN_DECIMALS = 6;
const VALUATION_DECIMALS = 6;

type RelistAssetBlockProps = {
  assetId: bigint;
  tokenContract: string;
};

export function RelistAssetBlock({ assetId, tokenContract }: RelistAssetBlockProps) {
  const { address } = useAccount();
  const { data: tokenInfo } = useDeployedContractInfo({
    contractName: "VaulticFractionalOwnershipToken",
  });
  const tokenAbi = tokenInfo?.abi ?? [];
  const abiReady = Array.isArray(tokenAbi) && tokenAbi.length > 0;

  const { data: totalSupplyRaw } = useReadContract({
    address: tokenContract as `0x${string}`,
    abi: tokenAbi,
    functionName: "totalSupply",
    query: { enabled: !!tokenContract && abiReady },
  });
  const { data: balanceRaw } = useReadContract({
    address: tokenContract as `0x${string}`,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!tokenContract && !!address && abiReady },
  });

  const { writeContractAsync: writeRelist, isMining: isRelisting } = useScaffoldWriteContract({
    contractName: "VaulticInvestmentManager",
  });

  const [newTotalShares, setNewTotalShares] = useState("");
  const [newPricePerShare, setNewPricePerShare] = useState("");
  const [newValuation, setNewValuation] = useState("");
  const [newMetadataURI, setNewMetadataURI] = useState("");
  const [newInvestorCap, setNewInvestorCap] = useState("0");

  const totalSupply = (totalSupplyRaw as bigint | undefined) ?? 0n;
  const balance = (balanceRaw as bigint | undefined) ?? 0n;
  const holdsFullSupply = totalSupply > 0n && balance === totalSupply;

  const handleRelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdsFullSupply) return;
    const shares = Math.max(0, Math.floor(Number(newTotalShares.replace(/,/g, ""))));
    const price = parseFloat(newPricePerShare.replace(/,/g, "")) || 0;
    const valuation = parseFloat(newValuation.replace(/,/g, "")) || 0;
    const cap = Math.max(0, Math.floor(Number(newInvestorCap.replace(/,/g, ""))));
    const uri = newMetadataURI.trim();

    if (shares <= 0) {
      notification.error("Enter a positive total shares");
      return;
    }
    if (price <= 0) {
      notification.error("Enter a positive price per share");
      return;
    }
    if (valuation <= 0) {
      notification.error("Enter a positive valuation");
      return;
    }
    if (!uri) {
      notification.error("Enter a metadata URI");
      return;
    }

    const priceWei = BigInt(Math.round(price * 10 ** PAYMENT_TOKEN_DECIMALS));
    const valuationWei = BigInt(Math.round(valuation * 10 ** VALUATION_DECIMALS));

    try {
      await writeRelist({
        functionName: "relistAsset",
        args: [assetId, BigInt(shares), priceWei, valuationWei, uri, BigInt(cap)],
      });
      notification.success("Asset relisted");
      setNewTotalShares("");
      setNewPricePerShare("");
      setNewValuation("");
      setNewMetadataURI("");
      setNewInvestorCap("0");
    } catch (err: unknown) {
      console.error(err);
      notification.error(getParsedError(err) || "Relist failed.");
    }
  };

  if (!abiReady) return null;
  if (totalSupply === 0n) return null;
  if (!holdsFullSupply) {
    return (
      <div className="mt-4 rounded-lg border border-base-300 bg-base-100/50 p-4">
        <h4 className="font-semibold text-base-content flex items-center gap-2">
          <ArrowPathIcon className="h-4 w-4 text-primary" />
          Relist
        </h4>
        <p className="mt-1 text-sm text-base-content/70">
          Only the address holding 100% of the fractional token supply can relist this closed asset.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <h4 className="font-semibold text-base-content flex items-center gap-2">
        <ArrowPathIcon className="h-4 w-4 text-primary" />
        Relist asset
      </h4>
      <p className="mt-1 text-sm text-base-content/70">
        You hold the full supply. Start a new offering round with new terms.
      </p>
      <form onSubmit={handleRelist} className="mt-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-base-content/70">Total shares</label>
            <input
              type="text"
              inputMode="numeric"
              value={newTotalShares}
              onChange={e => setNewTotalShares(e.target.value)}
              placeholder="e.g. 1000"
              className="input input-bordered input-sm w-full mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-base-content/70">Price per share</label>
            <input
              type="text"
              inputMode="decimal"
              value={newPricePerShare}
              onChange={e => setNewPricePerShare(e.target.value)}
              placeholder="e.g. 1.50"
              className="input input-bordered input-sm w-full mt-1"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-base-content/70">Valuation (USD)</label>
            <input
              type="text"
              inputMode="decimal"
              value={newValuation}
              onChange={e => setNewValuation(e.target.value)}
              placeholder="e.g. 1000000"
              className="input input-bordered input-sm w-full mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-base-content/70">Investor cap (0 = none)</label>
            <input
              type="text"
              inputMode="numeric"
              value={newInvestorCap}
              onChange={e => setNewInvestorCap(e.target.value)}
              placeholder="0"
              className="input input-bordered input-sm w-full mt-1"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-base-content/70">Metadata URI</label>
          <input
            type="text"
            value={newMetadataURI}
            onChange={e => setNewMetadataURI(e.target.value)}
            placeholder="https://..."
            className="input input-bordered input-sm w-full mt-1"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={
            isRelisting ||
            !newTotalShares ||
            !newPricePerShare ||
            !newValuation ||
            !newMetadataURI.trim() ||
            Number(newTotalShares) <= 0 ||
            Number(newPricePerShare) <= 0 ||
            Number(newValuation) <= 0
          }
        >
          {isRelisting ? "Relisting..." : "Relist asset"}
        </button>
      </form>
    </div>
  );
}
