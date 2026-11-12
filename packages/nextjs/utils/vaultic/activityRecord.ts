const STROOPS_PER_UNIT = 10_000_000n;

export type ActivityKind = "share_purchase" | "whole_asset" | "yield_deposit" | "yield_claim";

export type ActivityRow = {
  id: string;
  ledgerClosedAt: string;
  assetId: number;
  assetCode: string | null;
  kind: ActivityKind;
  account: string;
  shares: bigint | null;
  usdcStroops: bigint | null;
  feeStroops: bigint | null;
  txHash: string;
};

const KIND_BY_SYMBOL: Record<string, ActivityKind> = {
  buy_sh: "share_purchase",
  buy_whl: "whole_asset",
  yld_dep: "yield_deposit",
  yld_clm: "yield_claim",
  yld_all: "yield_claim",
};

const KIND_LABEL: Record<ActivityKind, string> = {
  share_purchase: "Share purchase",
  whole_asset: "Whole asset",
  yield_deposit: "Yield deposited",
  yield_claim: "Yield claimed",
};

export function activityKindLabel(kind: ActivityKind): string {
  return KIND_LABEL[kind];
}

function asBigInt(value: unknown): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value === "string" && /^-?\d+$/.test(value)) return BigInt(value);
  return null;
}

function asBigIntList(value: unknown): bigint[] {
  if (Array.isArray(value)) {
    return value.map(asBigInt).filter((amount): amount is bigint => amount !== null);
  }
  const single = asBigInt(value);
  return single === null ? [] : [single];
}

function asAssetId(value: unknown): number | null {
  const amount = asBigInt(value);
  if (amount === null || amount < 0n || amount > 0xffffffffn) return null;
  return Number(amount);
}

export function decodeActivity(
  topic: readonly unknown[],
  value: unknown,
): Omit<ActivityRow, "id" | "ledgerClosedAt" | "assetCode" | "txHash"> | null {
  if (topic.length < 3 || typeof topic[0] !== "string" || typeof topic[2] !== "string" || topic[2].length === 0) {
    return null;
  }
  const kind = KIND_BY_SYMBOL[topic[0]];
  const assetId = asAssetId(topic[1]);
  if (!kind || assetId === null) return null;

  const amounts = asBigIntList(value);
  if (kind === "share_purchase") {
    if (amounts.length < 3) return null;
    return {
      kind,
      assetId,
      account: topic[2],
      shares: amounts[0],
      usdcStroops: amounts[1],
      feeStroops: amounts[2],
    };
  }
  if (kind === "whole_asset") {
    if (amounts.length < 2) return null;
    return {
      kind,
      assetId,
      account: topic[2],
      shares: null,
      usdcStroops: amounts[0],
      feeStroops: amounts[1],
    };
  }
  if (amounts.length < 1) return null;
  return {
    kind,
    assetId,
    account: topic[2],
    shares: null,
    usdcStroops: amounts[0],
    feeStroops: null,
  };
}

export function formatStroops(stroops: bigint): string {
  const negative = stroops < 0n;
  const absolute = negative ? -stroops : stroops;
  const whole = absolute / STROOPS_PER_UNIT;
  const fraction = (absolute % STROOPS_PER_UNIT).toString().padStart(7, "0").replace(/0+$/, "");
  const body = fraction.length > 0 ? `${whole.toString()}.${fraction}` : whole.toString();
  return negative ? `-${body}` : body;
}

export function formatActivityAmount(row: Pick<ActivityRow, "shares" | "usdcStroops">): string {
  const parts: string[] = [];
  if (row.shares !== null) parts.push(`${row.shares.toString()} shares`);
  if (row.usdcStroops !== null) parts.push(`${formatStroops(row.usdcStroops)} USDC`);
  return parts.join(" · ");
}

export function formatActivityTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const formatted = date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
  return `${formatted} UTC`;
}

function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export function buildActivityCsv(rows: ActivityRow[]): string {
  const lines = ["date,asset,kind,shares,usdc,fee,transaction"];
  for (const row of rows) {
    lines.push(
      [
        row.ledgerClosedAt,
        row.assetCode ?? `#${row.assetId}`,
        activityKindLabel(row.kind),
        row.shares === null ? "" : row.shares.toString(),
        row.usdcStroops === null ? "" : formatStroops(row.usdcStroops),
        row.feeStroops === null ? "" : formatStroops(row.feeStroops),
        row.txHash,
      ]
        .map(csvField)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}
