import type { ReactElement } from "react";
import { BanknotesIcon } from "@heroicons/react/24/outline";

type AssetBuyPanelProps = {
  assetCode: string;
  totalShares: number;
  availableShares: number;
  busy: boolean;
  onBuy: () => void;
};

export function AssetBuyPanel({
  assetCode,
  totalShares,
  availableShares,
  busy,
  onBuy,
}: AssetBuyPanelProps): ReactElement {
  const soldOut = availableShares <= 0;

  return (
    <aside className="rounded-2xl border border-base-300 bg-base-100 p-5 lg:sticky lg:top-24">
      <h2 className="text-lg font-bold text-base-content">Buy shares</h2>
      <div className="mt-4 space-y-2 text-sm font-semibold">
        <div className="flex justify-between gap-3">
          <span className="text-base-content/70">Total shares</span>
          <span>{totalShares.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-3 text-primary">
          <span>Still available</span>
          <span>{availableShares.toLocaleString()}</span>
        </div>
      </div>
      <button
        className="btn btn-primary mt-4 w-full gap-2 rounded-xl font-bold"
        onClick={onBuy}
        disabled={soldOut || busy}
      >
        {busy ? "Sending purchase" : `Buy ${assetCode}`}
        <BanknotesIcon className="h-5 w-5" />
      </button>
      <p className="mt-3 text-sm font-medium leading-relaxed text-base-content/75">
        Verify your identity before you buy. Share prices can fall, and you can lose money.
      </p>
    </aside>
  );
}
