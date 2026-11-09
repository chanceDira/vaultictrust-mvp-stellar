import useSWR from "swr";
import { fetchUsdcTrustlineStatus, fetchUserRecord } from "~~/services/stellar/sorobanService";

export function useUserRecord(publicKey: string | null) {
  const { data, isLoading, mutate } = useSWR(
    publicKey ? ["user-record", publicKey] : null,
    () => fetchUserRecord(publicKey!),
    { revalidateOnFocus: false, dedupingInterval: 20000 },
  );
  return { kycRecord: data ?? null, isLoading, refresh: mutate };
}

export function useUsdcStatus(publicKey: string | null) {
  const { data, isLoading, mutate } = useSWR(
    publicKey ? ["usdc-status", publicKey] : null,
    () => fetchUsdcTrustlineStatus(publicKey!),
    { revalidateOnFocus: false, dedupingInterval: 20000 },
  );
  return { usdcStatus: data ?? null, isLoading, refresh: () => mutate() as Promise<void> };
}

export function useChainData(publicKey: string | null, isDeployed: boolean) {
  const { kycRecord } = useUserRecord(isDeployed ? publicKey : null);
  const { usdcStatus, refresh: refreshUsdc } = useUsdcStatus(publicKey);
  return { kycRecord, usdcStatus, refreshUsdc: refreshUsdc };
}
