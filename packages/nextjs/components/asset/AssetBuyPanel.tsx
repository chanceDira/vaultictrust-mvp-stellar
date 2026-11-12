import type { ReactElement } from "react";
import Link from "next/link";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import { formatUsdcAmount, protocolFee } from "~~/utils/vaultic/protocolFee";

type AssetBuyPanelProps = {
  assetCode: string;
  totalShares: number;
  availableShares: number;
  wholeAsset: boolean;
  valuation: bigint;
  feeBps: bigint | null;
  feeLoading: boolean;
  feeUnavailable: boolean;
  busy: boolean;
  chainUnavailable: boolean;
  onBuy: () => void;
};

export function AssetBuyPanel({
  assetCode,
  totalShares,
  availableShares,
  wholeAsset,
  valuation,
  feeBps,
  feeLoading,
  feeUnavailable,
  busy,
  chainUnavailable,
  onBuy,
}: AssetBuyPanelProps): ReactElement {
  const soldOut = availableShares <= 0 && !wholeAsset;
  const gross = valuation < 0n ? 0n : valuation;
  const fee = feeBps === null ? null : protocolFee(gross, feeBps);
  const sellerReceives = fee === null ? null : gross - fee;

  let feeLine: ReactElement | null = null;
  if (!wholeAsset) {
    feeLine = null;
  } else if (feeLoading) {
    feeLine = <p className="mt-4 text-sm font-medium text-base-content/60">Loading the protocol fee</p>;
  } else if (feeUnavailable || fee === null || sellerReceives === null) {
    feeLine = <p className="mt-4 text-sm font-medium text-base-content/60">The protocol fee could not be loaded.</p>;
  } else {
    feeLine = (
      <div className="mt-4 space-y-2 text-sm font-semibold">
        <div className="flex justify-between gap-3">
          <span className="text-base-content/70">You pay</span>
          <span className="tabular-nums">{formatUsdcAmount(gross)} USDC</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-base-content/70">Protocol fee</span>
          <span className="tabular-nums">{formatUsdcAmount(fee)} USDC</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-base-content/70">Seller receives</span>
          <span className="tabular-nums">{formatUsdcAmount(sellerReceives)} USDC</span>
        </div>
      </div>
    );
  }

  return (
    <aside className="rounded-2xl border border-base-300 bg-base-100 p-5 lg:sticky lg:top-24">
      <h2 className="text-lg font-bold text-base-content">{wholeAsset ? "Buy this asset" : "Buy shares"}</h2>
      {wholeAsset ? null : (
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
      )}
      {chainUnavailable ? (
        <p className="mt-4 text-sm font-medium text-base-content/60">
          Buying is paused because the chain could not be read.
        </p>
      ) : (
        feeLine
      )}
      <button
        className="btn btn-primary mt-4 w-full gap-2 rounded-xl font-bold"
        onClick={onBuy}
        disabled={soldOut || busy || chainUnavailable || (wholeAsset && fee === null)}
      >
        {busy ? "Sending purchase" : `Buy ${assetCode}`}
        <BanknotesIcon className="h-5 w-5" />
      </button>
      <p className="mt-3 text-sm font-medium leading-relaxed text-base-content/75">
        Verify your identity before you buy. Share prices can fall, and you can lose money.
      </p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        <Link href="/fees" className="text-sm font-semibold text-primary">
          Fee schedule
        </Link>
        <Link href="/risks" className="text-sm font-semibold text-primary">
          Risks
        </Link>
      </div>
    </aside>
  );
}
