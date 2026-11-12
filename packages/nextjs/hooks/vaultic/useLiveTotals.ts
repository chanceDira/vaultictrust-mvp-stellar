"use client";

import { useMarketplaceAssets } from "~~/hooks/vaultic/useAssets";
import { summarizeOpenListings } from "~~/utils/vaultic/liveTotals";
import type { LiveTotals } from "~~/utils/vaultic/liveTotals";

export function useLiveTotals(): { totals: LiveTotals | null; loading: boolean } {
  const { assets, isLoading, fromCopy, complete } = useMarketplaceAssets();
  if (isLoading || fromCopy || !complete) return { totals: null, loading: isLoading };
  return { totals: summarizeOpenListings(assets), loading: false };
}
