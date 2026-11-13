"use client";

import type { ReactElement } from "react";
import { DayBarChart } from "~~/components/asset/DayBarChart";
import { useHolderSnapshots } from "~~/hooks/vaultic/useHolderSnapshots";
import { formatCount } from "~~/utils/vaultic/liveTotals";

type HolderChartProps = {
  assetId: number;
};

function accountLabel(count: bigint): string {
  return count === 1n ? "1 account" : `${formatCount(count)} accounts`;
}

export function HolderChart({ assetId }: HolderChartProps): ReactElement {
  const { rows, loading, unavailable, truncated } = useHolderSnapshots(assetId);
  const latest = rows[rows.length - 1];

  if (loading) return <p className="text-sm font-medium text-base-content/60">Loading holder counts</p>;
  if (unavailable) {
    return <p className="text-sm font-medium text-base-content/70">Holder counts are unavailable right now.</p>;
  }
  if (!latest) {
    return (
      <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
        <h2 className="text-sm font-semibold text-base-content">Holders</h2>
        <p className="mt-2 text-sm font-medium text-base-content/60">No holder counts recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <DayBarChart
        title="Holders"
        caption="Accounts that hold this share asset. This is not a price."
        points={rows.map(row => ({
          day: row.capturedOn,
          primary: BigInt(row.holderCount),
          secondary: null,
          note: null,
        }))}
        primaryLabel="Holders"
        secondaryLabel={null}
        formatPrimary={accountLabel}
        formatSecondary={null}
        totalPrimary={accountLabel(BigInt(latest.holderCount))}
        totalSecondary={null}
        undatedNote={null}
      />
      {truncated ? (
        <p className="text-xs font-medium text-base-content/55">Older holder counts are not on this chart.</p>
      ) : null}
    </div>
  );
}
