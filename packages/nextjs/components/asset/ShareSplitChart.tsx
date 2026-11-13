"use client";

import { type ReactElement, useState } from "react";
import { formatCount } from "~~/utils/vaultic/liveTotals";
import { type ShareSplit, formatSharePercent } from "~~/utils/vaultic/shareSplit";

type Segment = "sold" | "remaining";

type ShareSplitChartProps = {
  split: ShareSplit;
};

const CENTER = 80;
const RADIUS = 58;
const GAP = 0.012;

function ringPoint(fraction: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + fraction * Math.PI * 2;
  return {
    x: CENTER + RADIUS * Math.cos(angle),
    y: CENTER + RADIUS * Math.sin(angle),
  };
}

function drawnSoldFraction(soldFraction: number, soldBelow: boolean, remainingBelow: boolean): number {
  if (soldBelow) return 0.012;
  if (remainingBelow) return 0.988;
  return soldFraction;
}

function ringPath(start: number, end: number): string {
  const from = ringPoint(start);
  const to = ringPoint(end);
  const large = end - start > 0.5 ? 1 : 0;
  return `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
}

export function ShareSplitChart({ split }: ShareSplitChartProps): ReactElement {
  const [active, setActive] = useState<Segment>("sold");
  const soldFraction = split.soldTenths / 1000;
  const soldBelow = split.sold > 0n && split.soldTenths === 0;
  const remainingBelow = split.remaining > 0n && split.remainingTenths === 0;
  const visualSold = drawnSoldFraction(soldFraction, soldBelow, remainingBelow);
  const gap = visualSold > 0.04 && visualSold < 0.96 ? GAP : 0;
  const activeTenths = active === "sold" ? split.soldTenths : split.remainingTenths;
  const activeBelow = active === "sold" ? soldBelow : remainingBelow;

  function showSold(): void {
    setActive("sold");
  }

  function showRemaining(): void {
    setActive("remaining");
  }

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
      <h2 className="text-sm font-semibold text-base-content">Share split</h2>
      <p className="mt-1 text-xs font-medium text-base-content/60">
        Shares sold and shares still for sale. This is not a price.
      </p>
      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
        <div className="relative h-36 w-36 shrink-0">
          <svg viewBox="0 0 160 160" className="h-full w-full" aria-hidden>
            {visualSold <= 0 || visualSold >= 1 ? (
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                strokeWidth={16}
                className={visualSold >= 1 ? "stroke-primary" : "stroke-primary/25"}
              />
            ) : (
              <>
                <path
                  d={ringPath(gap, Math.max(gap, visualSold - gap))}
                  fill="none"
                  strokeWidth={active === "sold" ? 18 : 14}
                  className="stroke-primary"
                />
                <path
                  d={ringPath(visualSold + gap, 1 - gap)}
                  fill="none"
                  strokeWidth={active === "remaining" ? 18 : 14}
                  className="stroke-primary/30"
                />
              </>
            )}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-lg font-bold tabular-nums text-base-content">
              {formatSharePercent(activeTenths, activeBelow)}%
            </p>
            <p className="text-xs font-semibold text-base-content/60">{active === "sold" ? "Sold" : "Remaining"}</p>
          </div>
        </div>
        <div className="grid w-full gap-2">
          <button
            type="button"
            onClick={showSold}
            onMouseEnter={showSold}
            onFocus={showSold}
            aria-pressed={active === "sold"}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-base-200"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span>Sold</span>
            <span className="ml-auto tabular-nums">{formatCount(split.sold)}</span>
            <span className="w-14 text-right tabular-nums text-base-content/70">
              {formatSharePercent(split.soldTenths, soldBelow)}%
            </span>
          </button>
          <button
            type="button"
            onClick={showRemaining}
            onMouseEnter={showRemaining}
            onFocus={showRemaining}
            aria-pressed={active === "remaining"}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-base-200"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-primary/30" />
            <span>Remaining</span>
            <span className="ml-auto tabular-nums">{formatCount(split.remaining)}</span>
            <span className="w-14 text-right tabular-nums text-base-content/70">
              {formatSharePercent(split.remainingTenths, remainingBelow)}%
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
