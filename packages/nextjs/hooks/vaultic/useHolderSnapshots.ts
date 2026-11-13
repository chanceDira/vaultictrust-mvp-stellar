"use client";

import { useEffect, useState } from "react";
import { readHolderChartBody } from "~~/utils/vaultic/holderCount";
import type { HolderPoint } from "~~/utils/vaultic/holderCount";

export function useHolderSnapshots(assetId: number | null): {
  rows: HolderPoint[];
  loading: boolean;
  unavailable: boolean;
  truncated: boolean;
} {
  const [rows, setRows] = useState<HolderPoint[]>([]);
  const [loading, setLoading] = useState(assetId !== null);
  const [unavailable, setUnavailable] = useState(false);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    if (assetId === null) {
      setRows([]);
      setLoading(false);
      setUnavailable(false);
      setTruncated(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch(`/api/holders?assetId=${assetId}`, { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("unavailable");
        return response.json() as Promise<unknown>;
      })
      .then(body => {
        if (cancelled) return;
        const parsed = readHolderChartBody(body);
        if (!parsed || parsed.skipped) {
          setRows([]);
          setUnavailable(true);
          setTruncated(false);
          return;
        }
        setRows(parsed.rows);
        setUnavailable(false);
        setTruncated(parsed.truncated);
      })
      .catch(() => {
        if (cancelled) return;
        setRows([]);
        setUnavailable(true);
        setTruncated(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  return { rows, loading, unavailable, truncated };
}
