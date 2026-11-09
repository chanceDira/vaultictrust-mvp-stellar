import useSWR from "swr";
import { fetchAsset, fetchTotalAssets } from "~~/services/stellar/sorobanService";
import type { OnChainAsset } from "~~/types/stellar";

const PAGE_SIZE = 10;
const ACTIVE_STATES = new Set(["Active", "Tokenized"]);

async function fetchAssetPage(pageIndex: number, total: number): Promise<OnChainAsset[]> {
  if (total === 0) return [];

  const start = pageIndex * PAGE_SIZE + 1;
  const end = Math.min(start + PAGE_SIZE - 1, total);
  const ids = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const settled = await Promise.allSettled(ids.map(id => fetchAsset(id)));
  return settled
    .filter((r): r is PromiseFulfilledResult<OnChainAsset> => r.status === "fulfilled" && r.value !== null)
    .map(r => r.value)
    .filter(a => ACTIVE_STATES.has(a.state.tag));
}

export function useTotalAssets() {
  const { data } = useSWR("total-assets", fetchTotalAssets, {
    revalidateOnFocus: false,
    dedupingInterval: 15_000,
  });
  return data ?? 0;
}

export function useAssets(pageIndex = 0) {
  const total = useTotalAssets();

  const { data, error, isLoading, mutate } = useSWR(
    total > 0 ? ["assets", pageIndex, total] : null,
    () => fetchAssetPage(pageIndex, total),
    {
      revalidateOnFocus: false,
      dedupingInterval: 15_000,
      keepPreviousData: true,
    },
  );

  return {
    assets: data ?? [],
    isLoading: total === 0 || isLoading,
    error: error as Error | undefined,
    refresh: mutate,
  };
}

export { PAGE_SIZE };
