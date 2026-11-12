import useSWR from "swr";
import { fetchAsset, fetchTotalAssets } from "~~/services/stellar/sorobanService";
import type { OnChainAsset } from "~~/types/stellar";
import { fetchStoredListings, rememberListingsOnce } from "~~/utils/vaultic/listingCopyClient";

const PAGE_SIZE = 10;
const VISIBLE_STATES = new Set(["Active", "Tokenized"]);

function visibleAssets(settled: PromiseSettledResult<OnChainAsset | null>[]): OnChainAsset[] {
  return settled
    .filter(
      (result): result is PromiseFulfilledResult<OnChainAsset> =>
        result.status === "fulfilled" && result.value !== null,
    )
    .map(result => result.value)
    .filter(asset => VISIBLE_STATES.has(asset.state.tag));
}

async function fetchAssetPage(pageIndex: number, total: number): Promise<OnChainAsset[]> {
  if (total === 0) return [];

  const start = pageIndex * PAGE_SIZE + 1;
  const end = Math.min(start + PAGE_SIZE - 1, total);
  const ids = Array.from({ length: end - start + 1 }, (_, index) => start + index);
  const settled = await Promise.allSettled(ids.map(id => fetchAsset(id)));
  const assets = visibleAssets(settled);
  if (assets.length === 0 && settled.some(result => result.status === "rejected")) {
    throw new Error("asset reads failed");
  }
  rememberListingsOnce(assets.map(asset => asset.asset_id));
  return assets;
}

const chainListOptions = {
  revalidateOnFocus: false,
  dedupingInterval: 15_000,
};

export function useTotalAssets(): number {
  const { data } = useSWR("total-assets", fetchTotalAssets, chainListOptions);
  return data ?? 0;
}

async function fetchMarketplaceAssets(): Promise<OnChainAsset[]> {
  const total = await fetchTotalAssets();
  if (total === 0) return [];

  const ids = Array.from({ length: total }, (_, index) => index + 1);
  const settled = await Promise.allSettled(ids.map(id => fetchAsset(id)));
  const assets = visibleAssets(settled).reverse();
  if (assets.length === 0 && settled.some(result => result.status === "rejected")) {
    throw new Error("asset reads failed");
  }
  rememberListingsOnce(assets.map(asset => asset.asset_id));
  return assets;
}

export function useMarketplaceAssets(): { assets: OnChainAsset[]; isLoading: boolean; fromCopy: boolean } {
  const chain = useSWR("marketplace-assets", fetchMarketplaceAssets, chainListOptions);
  const stored = useSWR(chain.error ? "stored-listings" : null, fetchStoredListings, chainListOptions);

  if (chain.error) {
    return { assets: stored.data ?? [], isLoading: stored.isLoading, fromCopy: true };
  }

  return { assets: chain.data ?? [], isLoading: chain.isLoading, fromCopy: false };
}

export function useAssets(pageIndex = 0): {
  assets: OnChainAsset[];
  total: number;
  isLoading: boolean;
  error: Error | undefined;
  fromCopy: boolean;
  refresh: () => void;
} {
  const totalQuery = useSWR("total-assets", fetchTotalAssets, chainListOptions);
  const total = totalQuery.data ?? 0;
  const chainPage = useSWR(
    !totalQuery.error && total > 0 ? ["assets", pageIndex, total] : null,
    () => fetchAssetPage(pageIndex, total),
    { ...chainListOptions, keepPreviousData: true },
  );
  const needsCopy = Boolean(totalQuery.error || chainPage.error);
  const stored = useSWR(needsCopy ? "stored-listings" : null, fetchStoredListings, chainListOptions);

  if (needsCopy) {
    const rows = stored.data ?? [];
    const start = pageIndex * PAGE_SIZE;
    return {
      assets: rows.slice(start, start + PAGE_SIZE),
      total: rows.length,
      isLoading: stored.isLoading,
      error: undefined,
      fromCopy: true,
      refresh: () => {
        void stored.mutate();
      },
    };
  }

  return {
    assets: chainPage.data ?? [],
    total,
    isLoading: total === 0 || totalQuery.isLoading || chainPage.isLoading,
    error: chainPage.error as Error | undefined,
    fromCopy: false,
    refresh: () => {
      void chainPage.mutate();
    },
  };
}

export { PAGE_SIZE };
