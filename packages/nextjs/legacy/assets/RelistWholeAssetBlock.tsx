"use client";

import { useState } from "react";
import { ArrowPathIcon, CubeIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

const VALUATION_DECIMALS = 6;

type RelistWholeAssetBlockProps = {
  assetId: bigint;
  assetName: string;
};

type RelistMode = "whole" | "fractional";

export function RelistWholeAssetBlock({ assetId, assetName }: RelistWholeAssetBlockProps) {
  const [mode, setMode] = useState<RelistMode>("whole");
  const [newValuation, setNewValuation] = useState("");
  const [newMetadataURI, setNewMetadataURI] = useState("");

  const { writeContractAsync: writeRelist, isMining } = useScaffoldWriteContract({
    contractName: "VaulticInvestmentManager",
  });

  const handleRelistAsWhole = async (e: React.FormEvent) => {
    e.preventDefault();
    const valuation = parseFloat(newValuation.replace(/,/g, "")) || 0;
    const uri = newMetadataURI.trim();
    if (valuation <= 0) {
      notification.error("Enter a positive valuation");
      return;
    }
    if (!uri) {
      notification.error("Enter a metadata URI");
      return;
    }
    const valuationWei = BigInt(Math.round(valuation * 10 ** VALUATION_DECIMALS));
    try {
      await writeRelist({
        functionName: "relistWholeAsset",
        args: [assetId, valuationWei, uri],
      });
      notification.success("Asset relisted for sale as whole.");
      setNewValuation("");
      setNewMetadataURI("");
    } catch (err: unknown) {
      console.error(err);
      const msg = getParsedError(err) || "Relist failed.";
      const s = typeof msg === "string" ? msg : "";
      const friendly = s.includes("UnauthorizedCaller")
        ? "Relist failed: protocol configuration error. The registry tokenizer may not be set to the Investment Manager. Ask the protocol admin to run registry.setTokenizer(InvestmentManagerProxyAddress)."
        : s.includes("Pausable") || s.includes("EnforcedPause") || s.includes("paused")
          ? "Relist failed: the registry is paused. Ask the protocol admin to unpause the registry in Control panel."
          : msg;
      notification.error(friendly);
    }
  };

  const handleRelistAsFractional = async (e: React.FormEvent) => {
    e.preventDefault();
    const valuation = parseFloat(newValuation.replace(/,/g, "")) || 0;
    const uri = newMetadataURI.trim();
    if (valuation <= 0) {
      notification.error("Enter a positive valuation");
      return;
    }
    if (!uri) {
      notification.error("Enter a metadata URI");
      return;
    }
    const valuationWei = BigInt(Math.round(valuation * 10 ** VALUATION_DECIMALS));
    try {
      await writeRelist({
        functionName: "relistAssetAsFractional",
        args: [assetId, valuationWei, uri],
      });
      notification.success(
        "Asset relisted as fractional. A protocol admin must tokenize it next to open the share offering.",
      );
      setNewValuation("");
      setNewMetadataURI("");
    } catch (err: unknown) {
      console.error(err);
      const msg = getParsedError(err) || "Relist failed.";
      const s = typeof msg === "string" ? msg : "";
      const friendly = s.includes("UnauthorizedCaller")
        ? "Relist failed: protocol configuration error. The registry tokenizer may not be set to the Investment Manager. Ask the protocol admin to run registry.setTokenizer(InvestmentManagerProxyAddress)."
        : s.includes("Pausable") || s.includes("EnforcedPause") || s.includes("paused")
          ? "Relist failed: the registry is paused. Ask the protocol admin to unpause the registry in Control panel."
          : msg;
      notification.error(friendly);
    }
  };

  const handleSubmit = mode === "whole" ? handleRelistAsWhole : handleRelistAsFractional;
  const valuationNum = parseFloat(newValuation.replace(/,/g, "")) || 0;
  const uriFilled = newMetadataURI.trim().length > 0;
  const canSubmit = valuationNum > 0 && uriFilled && !isMining;

  return (
    <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <h4 className="font-semibold text-base-content flex items-center gap-2">
        <ArrowPathIcon className="h-4 w-4 text-primary" />
        Relist {assetName || `asset #${assetId}`}
      </h4>
      <p className="mt-1 text-sm text-base-content/70">
        You own this asset. Relist it for sale as <strong>whole</strong> again or switch to <strong>fractional</strong>{" "}
        (shares).
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className={`btn btn-sm ${mode === "whole" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setMode("whole")}
        >
          <Squares2X2Icon className="h-4 w-4 mr-1" />
          As whole
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === "fractional" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setMode("fractional")}
        >
          <CubeIcon className="h-4 w-4 mr-1" />
          As fractional
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <div>
          <label className="text-xs font-medium text-base-content/70">New valuation (USD, 6 decimals)</label>
          <input
            type="text"
            inputMode="decimal"
            value={newValuation}
            onChange={e => setNewValuation(e.target.value)}
            placeholder="e.g. 100000"
            className="input input-bordered input-sm w-full mt-1"
          />
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
        <button type="submit" className="btn btn-primary btn-sm" disabled={!canSubmit}>
          {isMining ? "Relisting…" : mode === "whole" ? "Relist as whole" : "Relist as fractional"}
        </button>
      </form>

      {mode === "fractional" && (
        <p className="mt-2 text-xs text-base-content/60">
          After relisting as fractional, a protocol admin must tokenize the asset (set shares and price) to open the
          offering.
        </p>
      )}
    </div>
  );
}
