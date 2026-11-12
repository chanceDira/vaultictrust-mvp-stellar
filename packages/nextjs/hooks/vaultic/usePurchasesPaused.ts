"use client";

import useSWR from "swr";
import { fetchPurchasesPaused } from "~~/services/stellar/sorobanService";

const PAUSE_DEDUPING_MS = 15_000;

export function usePurchasesPaused(): { paused: boolean | null; loading: boolean } {
  const { data, isLoading } = useSWR("purchases-paused", fetchPurchasesPaused, {
    revalidateOnFocus: false,
    dedupingInterval: PAUSE_DEDUPING_MS,
  });

  return { paused: isLoading ? null : (data ?? null), loading: isLoading };
}
