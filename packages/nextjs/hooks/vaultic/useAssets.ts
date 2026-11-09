import useSWR from "swr";
import { fetchAsset, fetchTotalAssets } from "~~/services/stellar/sorobanService";
import type { OnChainAsset } from "~~/types/stellar";

const PAGE_SIZE = 10;

async function fetchAssetPage(pageIndex: number): Promise<OnChainAsset[]> {
  const total = await fetchTotalAssets();
  if (total === 0) return [];

  const start = pageIndex * PAGE_SIZE + 1;
  const end = Math.min(start + PAGE_SIZE - 1, total);
  const ids = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const results = await Promise.all(ids.map(id => fetchAsset(id)));
  return results.filter((a): a is OnChainAsset => a !== null);
}

async function fetchActiveAssets(pageIndex: number): Promise<OnChainAsset[]> {
  const page = await fetchAssetPage(pageIndex);
  return page.filter(a => a.state.tag === "Active" || a.state.tag === "Tokenized");
}

export function useAssets(pageIndex = 0) {
  const { data, error, isLoading, mutate } = useSWR(
    ["assets", pageIndex],
    () => fetchActiveAssets(pageIndex),
    {
      revalidateOnFocus: false,
      dedupingInterval: 15000,
      keepPreviousData: true,
    },
  );

  return {
    assets: data ?? [],
    isLoading,
    error: error as Error | undefined,
    refresh: mutate,
  };
}

export function useTotalAssets() {
  const { data } = useSWR("total-assets", fetchTotalAssets, {
    revalidateOnFocus: false,
    dedupingInterval: 15000,
  });
  return data ?? 0;
}

export { PAGE_SIZE };
