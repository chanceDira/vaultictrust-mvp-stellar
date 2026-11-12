"use client";

import useSWR from "swr";
import { fetchProtocolFeeBps } from "~~/services/stellar/investmentCalls";

const FEE_DEDUPING_MS = 60_000;

type ProtocolFeeState = {
  bps: bigint | null;
  loading: boolean;
  unavailable: boolean;
};

export function useProtocolFee(enabled: boolean): ProtocolFeeState {
  const { data, error, isLoading } = useSWR(enabled ? "protocol-fee-bps" : null, fetchProtocolFeeBps, {
    revalidateOnFocus: false,
    dedupingInterval: FEE_DEDUPING_MS,
  });

  return {
    bps: typeof data === "bigint" ? data : null,
    loading: enabled && isLoading,
    unavailable: Boolean(error) || data === null,
  };
}
