"use client";

type TokenProgressBarProps = {
  soldShares: bigint;
  totalShares: bigint;
  label?: string;
  showPct?: boolean;
};

export function TokenProgressBar({ soldShares, totalShares, label, showPct = true }: TokenProgressBarProps) {
  const total = totalShares > 0n ? Number(totalShares) : 0;
  const sold = total > 0 ? Number(soldShares) : 0;
  const pct = total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0;

  return (
    <div className="w-full">
      {(label || showPct) && (
        <div className="mb-1.5 flex justify-between text-xs font-medium text-base-content/70">
          {label && <span>{label}</span>}
          {showPct && <span>{pct}%</span>}
        </div>
      )}
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-base-300/80"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
