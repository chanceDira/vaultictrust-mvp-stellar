"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAsset, fetchYieldRoundCount } from "~~/services/stellar/sorobanService";
import type { OnChainAsset } from "~~/types/stellar";
import { notification } from "~~/utils/vaultic";
import { fetchStoredListing, rememberListing } from "~~/utils/vaultic/listingCopyClient";

function parseAssetId(assetId: string | string[] | undefined): number | null {
  const raw = Array.isArray(assetId) ? assetId[0] : assetId;
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  if (!Number.isInteger(id) || id < 0) return null;
  return id;
}

export function useAssetRecord(assetId: string | string[] | undefined): {
  asset: OnChainAsset | null;
  loading: boolean;
  loadError: boolean;
  fromCopy: boolean;
  yieldRoundCount: number | null;
  reload: () => void;
} {
  const [asset, setAsset] = useState<OnChainAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [fromCopy, setFromCopy] = useState(false);
  const [yieldRoundCount, setYieldRoundCount] = useState<number | null>(null);

  const reload = useCallback(async () => {
    const id = parseAssetId(assetId);
    setLoading(true);
    setLoadError(false);
    if (id === null) {
      setAsset(null);
      setFromCopy(false);
      setLoading(false);
      return;
    }

    try {
      const data = await fetchAsset(id);
      if (!data) {
        setAsset(null);
        setFromCopy(false);
        setYieldRoundCount(null);
        return;
      }
      setAsset(data);
      setFromCopy(false);
      rememberListing(data.asset_id);
      try {
        setYieldRoundCount(await fetchYieldRoundCount(id));
      } catch {
        setYieldRoundCount(null);
      }
    } catch {
      const saved = await fetchStoredListing(id);
      if (saved) {
        setAsset(saved);
        setFromCopy(true);
        setYieldRoundCount(null);
        return;
      }
      setLoadError(true);
      setAsset(null);
      notification.error("Failed to load asset details");
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { asset, loading, loadError, fromCopy, yieldRoundCount, reload };
}
