import type { ReactElement } from "react";
import Link from "next/link";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { getExplorerTxUrl } from "~~/scaffold.config";
import { shortenStellarAddress } from "~~/services/stellar/horizonClient";
import type { ActivityFeedRow } from "~~/utils/vaultic/activityFeed";
import { formatCount } from "~~/utils/vaultic/liveTotals";
import { formatUsdcAmount } from "~~/utils/vaultic/protocolFee";

type ActivityRowProps = {
  row: ActivityFeedRow;
  showAsset: boolean;
};

function activityTime(row: ActivityFeedRow): string {
  if (!row.occurredAt) return `Ledger ${formatCount(BigInt(row.ledger))}`;
  const time = Date.parse(row.occurredAt);
  if (!Number.isFinite(time)) return `Ledger ${formatCount(BigInt(row.ledger))}`;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(time);
}

function partyLine(row: ActivityFeedRow): string | null {
  const from = row.account ? shortenStellarAddress(row.account) : null;
  const to = row.counterparty ? shortenStellarAddress(row.counterparty) : null;
  if (from && to) return `${from} to ${to}`;
  return from ?? to;
}

function amountLine(row: ActivityFeedRow): string | null {
  const parts: string[] = [];
  if (row.shares) parts.push(`${formatCount(BigInt(row.shares))} shares`);
  if (row.usdcStroops) parts.push(`${formatUsdcAmount(BigInt(row.usdcStroops))} USDC`);
  if (row.feeStroops) parts.push(`fee ${formatUsdcAmount(BigInt(row.feeStroops))} USDC`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function ActivityRow({ row, showAsset }: ActivityRowProps): ReactElement {
  const parties = partyLine(row);
  const amounts = amountLine(row);
  return (
    <article className="border-b border-base-200 py-3 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-base-content">{row.label}</p>
        <a
          href={getExplorerTxUrl(row.txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary"
        >
          Transaction
          <ArrowTopRightOnSquareIcon className="h-3 w-3" />
        </a>
      </div>
      <p className="mt-1 text-xs font-medium text-base-content/55">{activityTime(row)}</p>
      {showAsset && row.assetId !== null ? (
        <Link href={`/asset/${row.assetId}`} className="mt-1 block text-xs font-semibold text-primary">
          Listing {row.assetId}
        </Link>
      ) : null}
      {parties ? <p className="mt-1 text-xs font-medium text-base-content/70">{parties}</p> : null}
      {amounts ? <p className="mt-1 text-sm font-medium tabular-nums text-base-content">{amounts}</p> : null}
    </article>
  );
}
