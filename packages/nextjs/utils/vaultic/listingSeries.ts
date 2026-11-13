import type { ActivityFeedRow } from "~~/utils/vaultic/activityFeed";

const DAY = /^(\d{4}-\d{2}-\d{2})/;

export type SalesPoint = {
  day: string;
  shares: bigint;
  usdc: bigint;
};

export type SalesSeries = {
  points: SalesPoint[];
  undatedShares: bigint;
  undatedUsdc: bigint;
};

export type PayoutPoint = {
  day: string;
  deposited: bigint;
  claimed: bigint;
};

export type PayoutSeries = {
  points: PayoutPoint[];
  undatedDeposited: bigint;
  undatedClaimed: bigint;
};

function dayOf(occurredAt: string | null): string | null {
  if (!occurredAt) return null;
  const match = DAY.exec(occurredAt);
  return match ? match[1] : null;
}

function stroops(value: string | null): bigint | null {
  if (value === null) return null;
  return BigInt(value);
}

export function salesSeries(rows: readonly ActivityFeedRow[]): SalesSeries {
  const byDay = new Map<string, SalesPoint>();
  let undatedShares = 0n;
  let undatedUsdc = 0n;

  for (const row of rows) {
    if (row.kind !== "buy_sh" && row.kind !== "buy_whl") continue;
    const shares = row.kind === "buy_sh" ? stroops(row.shares) : 0n;
    const usdc = stroops(row.usdcStroops);
    if (shares === null && usdc === null) continue;
    const day = dayOf(row.occurredAt);
    if (!day) {
      if (shares !== null) undatedShares += shares;
      if (usdc !== null) undatedUsdc += usdc;
      continue;
    }
    const current = byDay.get(day) ?? { day, shares: 0n, usdc: 0n };
    if (shares !== null) current.shares += shares;
    if (usdc !== null) current.usdc += usdc;
    byDay.set(day, current);
  }

  return {
    points: [...byDay.values()].sort((left, right) => left.day.localeCompare(right.day)),
    undatedShares,
    undatedUsdc,
  };
}

export function payoutSeries(rows: readonly ActivityFeedRow[]): PayoutSeries {
  const byDay = new Map<string, PayoutPoint>();
  let undatedDeposited = 0n;
  let undatedClaimed = 0n;

  for (const row of rows) {
    const deposited = row.kind === "yld_dep" ? stroops(row.usdcStroops) : null;
    const claimed = row.kind === "yld_clm" || row.kind === "yld_all" ? stroops(row.usdcStroops) : null;
    if (deposited === null && claimed === null) continue;
    const day = dayOf(row.occurredAt);
    if (!day) {
      if (deposited !== null) undatedDeposited += deposited;
      if (claimed !== null) undatedClaimed += claimed;
      continue;
    }
    const current = byDay.get(day) ?? { day, deposited: 0n, claimed: 0n };
    if (deposited !== null) current.deposited += deposited;
    if (claimed !== null) current.claimed += claimed;
    byDay.set(day, current);
  }

  return {
    points: [...byDay.values()].sort((left, right) => left.day.localeCompare(right.day)),
    undatedDeposited,
    undatedClaimed,
  };
}
