"use client";

import type { ReactElement } from "react";
import { useLiveTotals } from "~~/hooks/vaultic/useLiveTotals";
import { formatCount } from "~~/utils/vaultic/liveTotals";
import { formatUsdcAmount } from "~~/utils/vaultic/protocolFee";

export function LiveTotalsStrip(): ReactElement | null {
  const { totals } = useLiveTotals();
  if (!totals) return null;

  const figures = [
    { label: "Open listings", value: formatCount(BigInt(totals.openListings)) },
    { label: "Shares sold", value: formatCount(totals.sharesSold) },
    { label: "USDC raised", value: formatUsdcAmount(totals.usdcRaised) },
  ];

  return (
    <section className="border-t border-base-300/80 bg-base-100">
      <dl className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-3 sm:px-8 lg:px-12">
        {figures.map(figure => (
          <div key={figure.label} className="min-w-0">
            <dt className="text-xs font-medium text-base-content/55">{figure.label}</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums text-base-content sm:text-2xl">{figure.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
