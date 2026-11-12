"use client";

import { useEffect, useState } from "react";
import { readActivityFeedBody } from "~~/utils/vaultic/activityFeed";
import type { ActivityFeedRow } from "~~/utils/vaultic/activityFeed";

export function useActivityFeed(
  assetId: number | null,
  account: string | null,
): { rows: ActivityFeedRow[]; loading: boolean; unavailable: boolean; truncated: boolean } {
  const [rows, setRows] = useState<ActivityFeedRow[]>([]);
  const [loading, setLoading] = useState(assetId !== null || account !== null);
  const [unavailable, setUnavailable] = useState(false);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    if (assetId === null && !account) {
      setRows([]);
      setLoading(false);
      setUnavailable(false);
      setTruncated(false);
      return;
    }

    let cancelled = false;
    const params = assetId !== null ? `assetId=${assetId}` : `account=${account}`;
    setLoading(true);
    fetch(`/api/activities?${params}`, { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("unavailable");
        return response.json() as Promise<unknown>;
      })
      .then(body => {
        if (cancelled) return;
        const parsed = readActivityFeedBody(body);
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
  }, [assetId, account]);

  return { rows, loading, unavailable, truncated };
}
