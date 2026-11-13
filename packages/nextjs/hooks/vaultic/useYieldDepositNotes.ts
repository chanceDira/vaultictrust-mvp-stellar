"use client";

import { useEffect, useRef, useState } from "react";
import {
  type HeldAssetRef,
  type StoredYieldDeposit,
  type YieldDepositNote,
  yieldDepositNotes,
} from "~~/utils/vaultic/yieldDepositNote";

type DepositBody = {
  skipped?: unknown;
  deposits?: unknown;
};

function readDeposits(value: unknown): StoredYieldDeposit[] | null {
  if (!value || typeof value !== "object") return null;
  const body = value as DepositBody;
  if (body.skipped === true) return null;
  if (!Array.isArray(body.deposits)) return null;
  const deposits: StoredYieldDeposit[] = [];
  for (const entry of body.deposits) {
    if (!entry || typeof entry !== "object") return null;
    const row = entry as Record<string, unknown>;
    if (typeof row.assetId !== "number" || !Number.isInteger(row.assetId)) return null;
    if (typeof row.ledger !== "number" || !Number.isInteger(row.ledger) || row.ledger < 0) return null;
    if (row.occurredAt !== null && typeof row.occurredAt !== "string") return null;
    deposits.push({ assetId: row.assetId, ledger: row.ledger, occurredAt: row.occurredAt });
  }
  return deposits;
}

export function useYieldDepositNotes(holdings: readonly HeldAssetRef[]): {
  notes: YieldDepositNote[];
  loading: boolean;
  unavailable: boolean;
} {
  const holdingKey = holdings.map(holding => `${holding.assetId}:${holding.assetCode}`).join(",");
  const holdingsRef = useRef(holdings);
  holdingsRef.current = holdings;
  const [notes, setNotes] = useState<YieldDepositNote[]>([]);
  const [loading, setLoading] = useState(holdings.length > 0);
  const [unavailable, setUnavailable] = useState(false);
  const [seenKey, setSeenKey] = useState(holdingKey);
  if (seenKey !== holdingKey) {
    setSeenKey(holdingKey);
    setNotes([]);
    setLoading(holdings.length > 0);
    setUnavailable(false);
  }

  useEffect(() => {
    const currentHoldings = holdingsRef.current;
    if (currentHoldings.length === 0) {
      setNotes([]);
      setLoading(false);
      setUnavailable(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const assetIds = currentHoldings.map(holding => holding.assetId).join(",");
    fetch(`/api/yield-deposits?assetIds=${assetIds}`, { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("unavailable");
        return response.json() as Promise<unknown>;
      })
      .then(body => {
        if (cancelled) return;
        const deposits = readDeposits(body);
        if (!deposits) {
          setNotes([]);
          setUnavailable(true);
          return;
        }
        setNotes(yieldDepositNotes(currentHoldings, deposits));
        setUnavailable(false);
      })
      .catch(() => {
        if (cancelled) return;
        setNotes([]);
        setUnavailable(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [holdingKey]);

  return { notes, loading, unavailable };
}
