const PERCENT_TENTHS = 1000n;

export type ShareSplit = {
  sold: bigint;
  remaining: bigint;
  total: bigint;
  soldTenths: number;
  remainingTenths: number;
};

export function shareSplit(total: bigint, sold: bigint): ShareSplit | null {
  if (total <= 0n || sold < 0n || sold > total) return null;
  const soldTenths = Number((sold * PERCENT_TENTHS) / total);
  return {
    sold,
    remaining: total - sold,
    total,
    soldTenths,
    remainingTenths: Number(PERCENT_TENTHS) - soldTenths,
  };
}

export function formatSharePercent(tenths: number, belowTenth: boolean): string {
  if (belowTenth && tenths === 0) return "<0.1";
  const whole = Math.trunc(tenths / 10);
  const frac = tenths % 10;
  if (frac === 0) return String(whole);
  return `${whole}.${frac}`;
}
