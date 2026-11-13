"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchOfferSellers, fetchShareOffer } from "~~/services/stellar/investmentCalls";
import type { ResaleOffer } from "~~/utils/vaultic/resaleOffer";

export type ShareOfferState = {
  offers: ResaleOffer[];
  loading: boolean;
  unavailable: boolean;
  reload: () => void;
};

export function useShareOffers(assetId: number | null): ShareOfferState {
  const [offers, setOffers] = useState<ResaleOffer[]>([]);
  const [loading, setLoading] = useState(assetId !== null);
  const [unavailable, setUnavailable] = useState(false);
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => {
    setNonce(current => current + 1);
  }, []);

  useEffect(() => {
    if (assetId === null) {
      setOffers([]);
      setLoading(false);
      setUnavailable(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function loadOffers(): Promise<void> {
      try {
        const sellers = await fetchOfferSellers(assetId as number);
        const rows = await Promise.all(sellers.map(seller => fetchShareOffer(assetId as number, seller)));
        if (cancelled) return;
        setOffers(rows.filter((row): row is ResaleOffer => row !== null));
        setUnavailable(false);
      } catch {
        if (cancelled) return;
        setOffers([]);
        setUnavailable(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadOffers();
    return () => {
      cancelled = true;
    };
  }, [assetId, nonce]);

  return { offers, loading, unavailable, reload };
}
