"use client";

import { type ReactElement, useState } from "react";

export type DayBar = {
  day: string;
  primary: bigint;
  secondary: bigint | null;
  note: string | null;
};

type DayBarChartProps = {
  title: string;
  caption: string;
  points: DayBar[];
  primaryLabel: string;
  secondaryLabel: string | null;
  formatPrimary: (value: bigint) => string;
  formatSecondary: ((value: bigint) => string) | null;
  totalPrimary: string;
  totalSecondary: string | null;
  undatedNote: string | null;
};

const FULL_PERCENT = 100n;

function barHeight(value: bigint, max: bigint): string {
  if (max <= 0n || value <= 0n) return "0%";
  return `${Number((value * FULL_PERCENT) / max)}%`;
}

export function DayBarChart({
  title,
  caption,
  points,
  primaryLabel,
  secondaryLabel,
  formatPrimary,
  formatSecondary,
  totalPrimary,
  totalSecondary,
  undatedNote,
}: DayBarChartProps): ReactElement {
  const [activeDay, setActiveDay] = useState(points[points.length - 1]?.day ?? "");
  const active = points.find(point => point.day === activeDay) ?? points[points.length - 1];
  const max = points.reduce((highest, point) => {
    const secondary = point.secondary ?? 0n;
    const local = point.primary > secondary ? point.primary : secondary;
    return local > highest ? local : highest;
  }, 0n);

  function chooseDay(event: { currentTarget: HTMLButtonElement }): void {
    const day = event.currentTarget.dataset.day;
    if (day) setActiveDay(day);
  }

  function barLabel(point: DayBar): string {
    const primary = `${primaryLabel} ${formatPrimary(point.primary)}`;
    const note = point.note ? `, ${point.note}` : "";
    const secondary =
      secondaryLabel && formatSecondary && point.secondary !== null
        ? `, ${secondaryLabel} ${formatSecondary(point.secondary)}`
        : "";
    return `${point.day}, ${primary}${note}${secondary}`;
  }

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
      <h2 className="text-sm font-semibold text-base-content">{title}</h2>
      <p className="mt-1 text-xs font-medium text-base-content/60">{caption}</p>
      <p className="mt-3 text-sm font-semibold tabular-nums text-base-content">
        {totalPrimary}
        {totalSecondary ? ` · ${totalSecondary}` : ""}
      </p>
      {points.length > 0 && active ? (
        <>
          <div className="mt-4 flex h-28 items-end gap-1">
            {points.map(point => (
              <button
                key={point.day}
                type="button"
                data-day={point.day}
                onClick={chooseDay}
                onMouseEnter={chooseDay}
                onFocus={chooseDay}
                aria-pressed={point.day === active.day}
                aria-label={barLabel(point)}
                className="flex h-full min-w-0 flex-1 items-end gap-0.5 rounded-md px-0.5 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <span
                  className={`block w-full rounded-t ${point.day === active.day ? "bg-primary" : "bg-primary/50"}`}
                  style={{ height: barHeight(point.primary, max) }}
                />
                {point.secondary !== null ? (
                  <span
                    className={`block w-full rounded-t ${point.day === active.day ? "bg-primary/40" : "bg-primary/20"}`}
                    style={{ height: barHeight(point.secondary, max) }}
                  />
                ) : null}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm font-semibold text-base-content">
            {active.day}
            <span className="mt-1 block font-medium text-base-content/70">
              {primaryLabel} {formatPrimary(active.primary)}
              {active.note ? ` · ${active.note}` : ""}
              {secondaryLabel && formatSecondary && active.secondary !== null
                ? ` · ${secondaryLabel} ${formatSecondary(active.secondary)}`
                : ""}
            </span>
          </p>
        </>
      ) : null}
      {undatedNote ? <p className="mt-3 text-xs font-medium text-base-content/55">{undatedNote}</p> : null}
    </div>
  );
}
