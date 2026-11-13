"use client";

import { type MouseEvent, type ReactElement, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { getExplorerTxUrl } from "~~/scaffold.config";
import { cancelShareOffer, fetchShareOffer } from "~~/services/stellar/investmentCalls";
import { notification } from "~~/utils/vaultic";
import { formatCount } from "~~/utils/vaultic/liveTotals";
import { formatUsdcAmount } from "~~/utils/vaultic/protocolFee";
import type { ResaleOffer } from "~~/utils/vaultic/resaleOffer";

type HeldAsset = {
  assetId: number;
  assetCode: string;
};

type OpenOffer = ResaleOffer & {
  assetId: number;
  assetCode: string;
};

type WalletOffersProps = {
  holdings: HeldAsset[];
  holdingsLoading: boolean;
};

export function WalletOffers({ holdings, holdingsLoading }: WalletOffersProps): ReactElement {
  const { publicKey } = useStellarWallet();
  const [offers, setOffers] = useState<OpenOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [busyAssetId, setBusyAssetId] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => {
    setNonce(current => current + 1);
  }, []);

  useEffect(() => {
    if (!publicKey || holdingsLoading) return;
    let cancelled = false;
    setLoading(true);

    async function loadOffers(): Promise<void> {
      try {
        const rows = await Promise.all(
          holdings.map(async holding => {
            const offer = await fetchShareOffer(holding.assetId, publicKey as string);
            if (!offer) return null;
            return { ...offer, assetId: holding.assetId, assetCode: holding.assetCode };
          }),
        );
        if (cancelled) return;
        setOffers(rows.filter((row): row is OpenOffer => row !== null));
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
  }, [publicKey, holdings, holdingsLoading, nonce]);

  function handleCancelClick(event: MouseEvent<HTMLButtonElement>): void {
    const assetId = Number(event.currentTarget.dataset.assetId);
    if (!Number.isInteger(assetId)) return;
    void cancelOffer(assetId);
  }

  async function cancelOffer(assetId: number): Promise<void> {
    if (!publicKey || busyAssetId !== null) return;
    setBusyAssetId(assetId);
    try {
      const { hash } = await cancelShareOffer({ seller: publicKey, assetId }, publicKey);
      notification.success(
        <span>
          Offer cancelled.{" "}
          <a href={getExplorerTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="font-bold text-primary">
            View transaction
          </a>
        </span>,
      );
      reload();
    } catch (error: unknown) {
      notification.error(error instanceof Error ? error.message : "The offer could not be cancelled.");
    } finally {
      setBusyAssetId(null);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-base-content">Your offers</h2>
      {holdingsLoading || loading ? (
        <p className="mt-3 text-sm font-medium text-base-content/60">Loading your offers</p>
      ) : null}
      {unavailable ? (
        <p className="mt-3 text-sm font-medium text-base-content/70">Share offers are unavailable right now.</p>
      ) : null}
      {!holdingsLoading && !loading && !unavailable && offers.length === 0 ? (
        <p className="mt-3 text-sm font-medium text-base-content/70">You have no open share offers.</p>
      ) : null}
      {!loading && !unavailable ? (
        <div className="mt-4 space-y-3">
          {offers.map(offer => (
            <article key={offer.assetId} className="rounded-2xl border border-base-300 bg-base-100 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/asset/${offer.assetId}`} className="text-sm font-bold text-primary">
                  {offer.assetCode}
                </Link>
                <p className="text-sm font-semibold tabular-nums text-base-content">
                  {formatCount(offer.shares)} shares at {formatUsdcAmount(offer.priceStroops)} USDC
                </p>
              </div>
              <button
                className="btn btn-outline mt-4 rounded-xl font-bold"
                type="button"
                data-asset-id={offer.assetId}
                disabled={busyAssetId !== null}
                onClick={handleCancelClick}
              >
                {busyAssetId === offer.assetId ? "Cancelling offer" : "Cancel offer"}
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
