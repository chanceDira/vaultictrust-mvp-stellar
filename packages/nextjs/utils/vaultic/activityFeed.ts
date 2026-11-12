import { formatUsdcAmount } from "~~/utils/vaultic/protocolFee";

const STROOP = /^(?:0|[1-9]\d*)$/;
const TX_HASH = /^[a-fA-F0-9]{64}$/;
const STELLAR_ACCOUNT = /^[GC][A-Z2-7]{55}$/;
const MAX_EVENT_ID_CHARS = 120;
const MAX_ASSET_ID = 1_000_000;

export const ACTIVITY_FEED_LIMIT = 100;

export const ACTIVITY_FEED_KINDS = [
  "buy_sh",
  "buy_whl",
  "sell_sh",
  "yld_dep",
  "yld_clm",
  "yld_all",
  "withdrw",
  "own_xfr",
] as const;

const KIND_LABEL: Record<(typeof ACTIVITY_FEED_KINDS)[number], string> = {
  buy_sh: "Share purchase",
  buy_whl: "Whole-asset purchase",
  sell_sh: "Share resale",
  yld_dep: "Yield deposited",
  yld_clm: "Yield claimed",
  yld_all: "All yield claimed",
  withdrw: "Proceeds withdrawn",
  own_xfr: "Ownership transferred",
};

export type ActivityFeedRow = {
  eventId: string;
  ledger: number;
  occurredAt: string | null;
  kind: (typeof ACTIVITY_FEED_KINDS)[number];
  label: string;
  assetId: number | null;
  account: string | null;
  counterparty: string | null;
  shares: string | null;
  usdcStroops: string | null;
  feeStroops: string | null;
  txHash: string;
};

export type ActivityFeedBody = {
  skipped: boolean;
  rows: ActivityFeedRow[];
  truncated: boolean;
};

function stroopOrNull(value: unknown): string | null {
  return typeof value === "string" && STROOP.test(value) ? value : null;
}

function accountOrNull(value: unknown): string | null {
  return typeof value === "string" && STELLAR_ACCOUNT.test(value) ? value : null;
}

function assetIdOrNull(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > MAX_ASSET_ID) return null;
  return value;
}

function occurredAtOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return new Date(time).toISOString();
}

function amountsForKind(
  kind: string,
  amount: unknown,
  secondary: unknown,
  tertiary: unknown,
): { shares: string | null; usdcStroops: string | null; feeStroops: string | null } | null {
  const first = stroopOrNull(amount);
  const second = stroopOrNull(secondary);
  const third = stroopOrNull(tertiary);
  if (kind === "buy_sh" || kind === "sell_sh") return { shares: first, usdcStroops: second, feeStroops: third };
  if (kind === "buy_whl") return { shares: null, usdcStroops: first, feeStroops: second };
  if (kind === "yld_dep" || kind === "yld_clm" || kind === "yld_all" || kind === "withdrw") {
    return { shares: null, usdcStroops: first, feeStroops: null };
  }
  if (kind === "own_xfr") return { shares: null, usdcStroops: null, feeStroops: null };
  return null;
}

function isFeedKind(kind: string): kind is (typeof ACTIVITY_FEED_KINDS)[number] {
  return (ACTIVITY_FEED_KINDS as readonly string[]).includes(kind);
}

export function readActivityFeedRow(value: unknown): ActivityFeedRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const eventId = typeof row.eventId === "string" ? row.eventId : "";
  const kind = typeof row.kind === "string" ? row.kind : "";
  const txHash = typeof row.txHash === "string" ? row.txHash.toLowerCase() : "";
  if (eventId.length === 0 || eventId.length > MAX_EVENT_ID_CHARS) return null;
  if (!isFeedKind(kind) || !TX_HASH.test(txHash)) return null;
  if (typeof row.ledger !== "number" || !Number.isInteger(row.ledger) || row.ledger < 0) return null;
  return {
    eventId,
    ledger: row.ledger,
    occurredAt: occurredAtOrNull(row.occurredAt),
    kind,
    label: KIND_LABEL[kind],
    assetId: assetIdOrNull(row.assetId),
    account: accountOrNull(row.account),
    counterparty: accountOrNull(row.counterparty),
    shares: stroopOrNull(row.shares),
    usdcStroops: stroopOrNull(row.usdcStroops),
    feeStroops: stroopOrNull(row.feeStroops),
    txHash,
  };
}

export function activityFeedFromStored(value: unknown): ActivityFeedRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const kind = typeof row.kind === "string" ? row.kind : "";
  const amounts = amountsForKind(kind, row.amount, row.amount_secondary, row.amount_tertiary);
  if (!amounts) return null;
  return readActivityFeedRow({
    eventId: row.event_id,
    ledger: row.ledger,
    occurredAt: row.ledger_closed_at,
    kind,
    assetId: row.asset_id,
    account: row.account,
    counterparty: row.counterparty,
    shares: amounts.shares,
    usdcStroops: amounts.usdcStroops,
    feeStroops: amounts.feeStroops,
    txHash: row.tx_hash,
  });
}

export function readActivityFeedBody(value: unknown): ActivityFeedBody | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (typeof body.skipped !== "boolean" || typeof body.truncated !== "boolean" || !Array.isArray(body.rows)) {
    return null;
  }
  return {
    skipped: body.skipped,
    truncated: body.truncated,
    rows: body.rows.map(readActivityFeedRow).filter((row): row is ActivityFeedRow => row !== null),
  };
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function csvUsdc(stroops: string | null): string {
  if (stroops === null) return "";
  return formatUsdcAmount(BigInt(stroops));
}

export function activityCsv(rows: readonly ActivityFeedRow[]): string {
  const header = "date,asset,kind,shares,usdc,fee,transaction";
  const lines = rows.map(row =>
    [
      row.occurredAt ?? "",
      row.assetId === null ? "" : String(row.assetId),
      row.label,
      row.shares ?? "",
      csvUsdc(row.usdcStroops),
      csvUsdc(row.feeStroops),
      row.txHash,
    ]
      .map(csvCell)
      .join(","),
  );
  return [header, ...lines].join("\n");
}
