"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const OWNERSHIP_MODEL = [
  { value: 0, label: "Whole ownership" },
  { value: 1, label: "Fractional" },
];

export function AssetForm() {
  const { address } = useAccount();
  const [assetName, setAssetName] = useState("");
  const [assetCategory, setAssetCategory] = useState("");
  const [metadataURI, setMetadataURI] = useState("");
  const [valuation, setValuation] = useState("");
  const [model, setModel] = useState<0 | 1>(1);

  const { writeContractAsync, isMining } = useScaffoldWriteContract({
    contractName: "VaulticAssetRegistry",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      notification.error("Connect your wallet");
      return;
    }
    const name = assetName.trim();
    const category = assetCategory.trim();
    const uri = metadataURI.trim();
    if (!name || !category || !uri) {
      notification.error("Fill name, category, and metadata URI");
      return;
    }
    const val = valuation.replace(/,/g, "");
    const valuationWei = val ? BigInt(Math.round(parseFloat(val) * 1e6)) : 0n;
    if (valuationWei <= 0n) {
      notification.error("Valuation must be positive (USD, 6 decimals)");
      return;
    }

    try {
      await writeContractAsync({
        functionName: "registerAsset",
        args: [address, name, category, uri, valuationWei, model],
      });
      notification.success("Asset registered");
      setAssetName("");
      setAssetCategory("");
      setMetadataURI("");
      setValuation("");
    } catch (e: unknown) {
      console.error(e);
      notification.error("Registration failed. Only the registry owner can register.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">
      <h3 className="font-bold text-base-content">Register asset</h3>
      <p className="mt-1 text-sm text-base-content/70">
        Only the protocol (registry owner) can submit. Connect as registry owner to register on behalf of an owner.
      </p>
      <div className="mt-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-base-content/70">Asset name</label>
          <input
            type="text"
            value={assetName}
            onChange={e => setAssetName(e.target.value)}
            className="input input-bordered input-sm w-full mt-1"
            placeholder="e.g. Kigali Green Tower"
            disabled={!address}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-base-content/70">Category</label>
          <input
            type="text"
            value={assetCategory}
            onChange={e => setAssetCategory(e.target.value)}
            className="input input-bordered input-sm w-full mt-1"
            placeholder="e.g. Real Estate"
            disabled={!address}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-base-content/70">Metadata URI</label>
          <input
            type="text"
            value={metadataURI}
            onChange={e => setMetadataURI(e.target.value)}
            className="input input-bordered input-sm w-full mt-1"
            placeholder="https://..."
            disabled={!address}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-base-content/70">Valuation (USD)</label>
          <input
            type="text"
            value={valuation}
            onChange={e => setValuation(e.target.value)}
            className="input input-bordered input-sm w-full mt-1"
            placeholder="1000000"
            disabled={!address}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-base-content/70">Ownership model</label>
          <select
            value={model}
            onChange={e => setModel(Number(e.target.value) as 0 | 1)}
            className="select select-bordered select-sm w-full mt-1"
            disabled={!address}
          >
            {OWNERSHIP_MODEL.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button type="submit" className="btn btn-primary btn-sm mt-4" disabled={!address || isMining}>
        {isMining ? "Registering..." : "Register asset"}
      </button>
    </form>
  );
}
