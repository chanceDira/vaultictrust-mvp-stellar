"use client";

import useSWR from "swr";
import { fetchListingActivity, fetchWalletActivity } from "~~/services/stellar/activityEvents";
import type { ActivityRow } from "~~/utils/vaultic/activityRecord";

const ACTIVITY_DEDUPING_MS = 15_000;

type ActivityState = {
  rows: ActivityRow[];
  loading: boolean;
  unavailable: boolean;
};

function useActivity(key: string | null, load: () => Promise<ActivityRow[]>): ActivityState {
  const { data, error, isLoading } = useSWR(key, load, {
    revalidateOnFocus: false,
    dedupingInterval: ACTIVITY_DEDUPING_MS,
  });
  return {
    rows: data ?? [],
    loading: Boolean(key) && isLoading,
    unavailable: Boolean(error),
  };
}

export function useListingActivity(assetId: number | null): ActivityState {
  return useActivity(assetId === null ? null : `listing-activity-${assetId}`, () => fetchListingActivity(assetId ?? 0));
}

export function useWalletActivity(account: string | null): ActivityState {
  return useActivity(account ? `wallet-activity-${account}` : null, () => fetchWalletActivity(account ?? ""));
}
