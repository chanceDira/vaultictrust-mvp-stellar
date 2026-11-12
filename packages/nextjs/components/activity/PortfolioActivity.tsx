"use client";

import type { ReactElement } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { ActivityFeed } from "~~/components/activity/ActivityFeed";
import { useWalletActivity } from "~~/hooks/vaultic/useActivity";
import { buildActivityCsv } from "~~/utils/vaultic/activityRecord";

type PortfolioActivityProps = {
  account: string;
};

function downloadCsv(csv: string): void {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "vtrust-activity.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function PortfolioActivity({ account }: PortfolioActivityProps): ReactElement {
  const { rows, loading, unavailable } = useWalletActivity(account);

  const downloadActivity = () => {
    downloadCsv(buildActivityCsv(rows));
  };

  return (
    <ActivityFeed
      rows={rows}
      loading={loading}
      unavailable={unavailable}
      showAsset
      empty="No purchases or yield payments are recorded for this wallet yet."
      note="Recent purchases and yield payments for this wallet. It is not tax advice."
      toolbar={
        <button
          type="button"
          className="btn btn-outline btn-sm gap-2 rounded-xl"
          disabled={loading || unavailable || rows.length === 0}
          onClick={downloadActivity}
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Download CSV
        </button>
      }
    />
  );
}
