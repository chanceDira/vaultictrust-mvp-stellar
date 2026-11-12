"use client";

import type { ReactElement } from "react";
import { ActivityRow } from "~~/components/activity/ActivityRow";
import { useActivityFeed } from "~~/hooks/vaultic/useActivityFeed";
import { activityCsv } from "~~/utils/vaultic/activityFeed";
import type { ActivityFeedRow } from "~~/utils/vaultic/activityFeed";

type ActivityFeedProps = {
  assetId?: number;
  account?: string;
  exportCsv?: boolean;
};

function saveCsv(rows: readonly ActivityFeedRow[]): void {
  const file = new Blob([activityCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "vtrust-activity.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ActivityFeed({ assetId, account, exportCsv = false }: ActivityFeedProps): ReactElement | null {
  const queryAssetId = typeof assetId === "number" ? assetId : null;
  const queryAccount = queryAssetId === null && account ? account : null;
  const { rows, loading, unavailable, truncated } = useActivityFeed(queryAssetId, queryAccount);
  if (queryAssetId === null && !queryAccount) return null;

  const emptyCopy = queryAccount ? "No activity for this wallet yet." : "No activity for this listing yet.";
  const downloadCsv = (): void => {
    saveCsv(rows);
  };

  return (
    <section className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-base-content">Activity</h2>
        {exportCsv && rows.length > 0 ? (
          <button type="button" onClick={downloadCsv} className="text-xs font-semibold text-primary">
            Download CSV
          </button>
        ) : null}
      </div>
      {loading ? <p className="mt-3 text-sm font-medium text-base-content/60">Loading activity</p> : null}
      {!loading && unavailable ? (
        <p className="mt-3 text-sm font-medium text-base-content/60">Activity is unavailable right now.</p>
      ) : null}
      {!loading && !unavailable && rows.length === 0 ? (
        <p className="mt-3 text-sm font-medium text-base-content/60">{emptyCopy}</p>
      ) : null}
      {!loading && !unavailable && rows.length > 0 ? (
        <div className="mt-2">
          {rows.map(row => (
            <ActivityRow key={row.eventId} row={row} showAsset={queryAccount !== null} />
          ))}
        </div>
      ) : null}
      {!loading && truncated ? (
        <p className="mt-3 text-xs font-medium text-base-content/55">Older activity is not listed here.</p>
      ) : null}
      {exportCsv ? (
        <p className="mt-3 text-xs font-medium leading-relaxed text-base-content/55">
          The CSV is a record of these rows. It is not tax advice.
        </p>
      ) : null}
    </section>
  );
}
