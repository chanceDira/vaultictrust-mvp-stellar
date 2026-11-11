"use client";

import useSWR from "swr";
import { loadAssetMetadata, type AssetMetadata } from "~~/services/stellar/assetMetadata";

type AssetMetadataState = {
  metadata: AssetMetadata | null;
  unavailable: boolean;
  isLoading: boolean;
};

export function useAssetMetadata(uri: string): AssetMetadataState {
  const { data, isLoading } = useSWR(uri ? ["asset-metadata", uri] : null, () => loadAssetMetadata(uri));

  return {
    metadata: data?.metadata ?? null,
    unavailable: data?.unavailable ?? false,
    isLoading: Boolean(uri) && isLoading,
  };
}
