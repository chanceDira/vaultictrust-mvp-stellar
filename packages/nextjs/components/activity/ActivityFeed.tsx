"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import { ArrowTopRightOnSquareIcon, CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { getExplorerTxUrl } from "~~/scaffold.config";
import { shortenStellarAddress } from "~~/services/stellar/horizonClient";
import type { ActivityRow } from "~~/utils/vaultic/activityRecord";
import { activityKindLabel, formatActivityAmount, formatActivityTime } from "~~/utils/vaultic/activityRecord";

const COPIED_RESET_MS = 1600;

type ActivityFeedProps = {
  rows: ActivityRow[];
  loading: boolean;
  unavailable: boolean;
  empty: string;
  note: string;
  showAsset: boolean;
  toolbar?: ReactElement;
};

async function writeText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function ActivityFeed({
  rows,
  loading,
  unavailable,
  empty,
  note,
  showAsset,
  toolbar,
}: ActivityFeedProps): ReactElement {
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  const copyAccount = async (account: string) => {
    const wrote = await writeText(account);
    if (!wrote) return;
    setCopiedAccount(account);
    window.setTimeout(() => setCopiedAccount(current => (current === account ? null : current)), COPIED_RESET_MS);
  };

  let body: ReactElement;
  if (loading) {
    body = <p className="mt-1 text-sm font-medium text-base-content/60">Loading activity</p>;
  } else if (unavailable) {
    body = <p className="mt-1 text-sm font-medium text-base-content/60">Activity is unavailable right now.</p>;
  } else if (rows.length === 0) {
    body = <p className="mt-1 text-sm font-medium text-base-content/60">{empty}</p>;
  } else {
    body = (
      <ul className="mt-3 divide-y divide-base-300/80 rounded-xl border border-base-300">
        {rows.map(row => {
          const amount = formatActivityAmount(row);
          const copied = copiedAccount === row.account;
          return (
            <li key={row.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-base-content">
                  {activityKindLabel(row.kind)}
                  {showAsset ? ` · ${row.assetCode ?? `#${row.assetId}`}` : ""}
                </p>
                <p className="mt-0.5 text-xs font-medium text-base-content/55">
                  {formatActivityTime(row.ledgerClosedAt)}
                  {amount ? ` · ${amount}` : ""}
                </p>
                <p className="mt-0.5 truncate font-mono text-xs font-medium text-base-content/70" title={row.account}>
                  {shortenStellarAddress(row.account, 4)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-xs h-7 min-h-0 px-1.5"
                  aria-label="Copy account"
                  onClick={() => copyAccount(row.account)}
                >
                  {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <ClipboardDocumentIcon className="h-3.5 w-3.5" />}
                </button>
                <a
                  href={getExplorerTxUrl(row.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Transaction
                  <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-base-content">Activity</h2>
        {toolbar}
      </div>
      <p className="mt-1 text-sm font-medium text-base-content/60">{note}</p>
      {body}
    </section>
  );
}
