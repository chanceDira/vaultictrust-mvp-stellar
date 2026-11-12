"use client";

import type { ReactElement } from "react";
import { useProtocolFee } from "~~/hooks/vaultic/useProtocolFee";
import { feeExample, formatFeePercent, formatUsdcAmount } from "~~/utils/vaultic/protocolFee";

export function FeeSchedule(): ReactElement {
  const { bps, loading, unavailable } = useProtocolFee(true);
  const example = bps === null ? null : feeExample(bps);

  let body: ReactElement;
  if (loading) {
    body = <p className="mt-4 text-sm font-medium text-base-content/60">Loading the protocol fee</p>;
  } else if (unavailable || bps === null || example === null) {
    body = <p className="mt-4 text-sm font-medium text-base-content/60">The protocol fee could not be read.</p>;
  } else {
    body = (
      <div className="mt-6 space-y-6 text-left">
        <p className="text-3xl font-bold tabular-nums text-base-content">{formatFeePercent(bps)}</p>
        <dl className="space-y-3 rounded-2xl border border-base-300 bg-base-100 p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-sm font-medium text-base-content/60">Share price</dt>
            <dd className="text-sm font-semibold tabular-nums text-base-content">
              {formatUsdcAmount(example.priceStroops)} USDC
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-sm font-medium text-base-content/60">Shares</dt>
            <dd className="text-sm font-semibold tabular-nums text-base-content">{example.shareCount.toString()}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-sm font-medium text-base-content/60">Protocol fee</dt>
            <dd className="text-sm font-semibold tabular-nums text-base-content">
              {formatUsdcAmount(example.feeStroops)} USDC
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-sm font-medium text-base-content/60">Total you pay</dt>
            <dd className="text-sm font-semibold tabular-nums text-base-content">
              {formatUsdcAmount(example.totalStroops)} USDC
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <section>
      <h2 className="mt-8 text-xl font-semibold text-base-content">Current rate</h2>
      <p className="mt-2 text-base leading-relaxed text-base-content/85">
        The rate below is stored on the investment contract. The example uses a fixed share price. Only the fee changes
        when an admin updates the contract. The fee comes out of the total. It is not added on top.
      </p>
      {body}
    </section>
  );
}
