"use client";

import type { ReactElement } from "react";
import { DayBarChart } from "~~/components/asset/DayBarChart";
import { useActivityFeed } from "~~/hooks/vaultic/useActivityFeed";
import { payoutSeries, salesSeries } from "~~/utils/vaultic/listingSeries";
import { formatCount } from "~~/utils/vaultic/liveTotals";
import { formatUsdcAmount } from "~~/utils/vaultic/protocolFee";

type ListingHistoryProps = {
  assetId: number;
};

function usdcLabel(stroops: bigint): string {
  return `${formatUsdcAmount(stroops)} USDC`;
}

export function ListingHistory({ assetId }: ListingHistoryProps): ReactElement {
  const { rows, loading, unavailable, truncated } = useActivityFeed(assetId, null);
  const sales = salesSeries(rows);
  const payouts = payoutSeries(rows);
  const saleShares = sales.points.reduce((sum, point) => sum + point.shares, 0n) + sales.undatedShares;
  const saleUsdc = sales.points.reduce((sum, point) => sum + point.usdc, 0n) + sales.undatedUsdc;
  const deposited = payouts.points.reduce((sum, point) => sum + point.deposited, 0n) + payouts.undatedDeposited;
  const claimed = payouts.points.reduce((sum, point) => sum + point.claimed, 0n) + payouts.undatedClaimed;
  const salesUndated = sales.undatedShares > 0n || sales.undatedUsdc > 0n;
  const payoutsUndated = payouts.undatedDeposited > 0n || payouts.undatedClaimed > 0n;

  if (loading) {
    return <p className="text-sm font-medium text-base-content/60">Loading sales and yield</p>;
  }
  if (unavailable) {
    return <p className="text-sm font-medium text-base-content/70">Sales and yield are unavailable right now.</p>;
  }

  return (
    <div className="space-y-4">
      {sales.points.length === 0 && saleShares === 0n && saleUsdc === 0n ? (
        <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
          <h2 className="text-sm font-semibold text-base-content">Sales</h2>
          <p className="mt-2 text-sm font-medium text-base-content/60">No sales recorded yet.</p>
        </div>
      ) : (
        <DayBarChart
          title="Sales"
          caption="USDC paid for shares or for the whole asset. This is not a share price."
          points={sales.points.map(point => ({
            day: point.day,
            primary: point.usdc,
            secondary: null,
            note: point.shares > 0n ? `${formatCount(point.shares)} shares` : null,
          }))}
          primaryLabel="USDC"
          secondaryLabel={null}
          formatPrimary={usdcLabel}
          formatSecondary={null}
          totalPrimary={usdcLabel(saleUsdc)}
          totalSecondary={saleShares > 0n ? `${formatCount(saleShares)} shares` : null}
          undatedNote={salesUndated ? "Some sales have no date, so they are in the total and not on the chart." : null}
        />
      )}
      {payouts.points.length === 0 && deposited === 0n && claimed === 0n ? (
        <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
          <h2 className="text-sm font-semibold text-base-content">Yield</h2>
          <p className="mt-2 text-sm font-medium text-base-content/60">No yield recorded yet.</p>
        </div>
      ) : (
        <DayBarChart
          title="Yield"
          caption="Yield deposited and yield claimed. This is not a share price."
          points={payouts.points.map(point => ({
            day: point.day,
            primary: point.deposited,
            secondary: point.claimed,
            note: null,
          }))}
          primaryLabel="Deposited"
          secondaryLabel="Claimed"
          formatPrimary={usdcLabel}
          formatSecondary={usdcLabel}
          totalPrimary={`Deposited ${usdcLabel(deposited)}`}
          totalSecondary={`Claimed ${usdcLabel(claimed)}`}
          undatedNote={
            payoutsUndated ? "Some yield rows have no date, so they are in the total and not on the chart." : null
          }
        />
      )}
      {truncated ? (
        <p className="text-xs font-medium text-base-content/55">These charts use the latest recorded rows.</p>
      ) : null}
    </div>
  );
}
