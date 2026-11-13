"use client";

import { type ReactElement, useEffect, useState } from "react";
import { ShareOfferForm } from "~~/components/asset/ShareOfferForm";
import { ShareOfferRow } from "~~/components/asset/ShareOfferRow";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { useShareOffers } from "~~/hooks/vaultic/useShareOffers";
import { getExplorerTxUrl } from "~~/scaffold.config";
import {
  cancelShareOffer,
  createShareOffer,
  fetchInvestorHoldings,
  fillShareOffer,
} from "~~/services/stellar/investmentCalls";
import { notification } from "~~/utils/vaultic";

type ShareResaleSectionProps = {
  assetId: number;
  feeBps: bigint | null;
  feeLoading: boolean;
  purchasesPaused: boolean;
  chainUnavailable: boolean;
};

function txLink(hash: string): ReactElement {
  return (
    <a href={getExplorerTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="font-bold text-primary">
      View transaction
    </a>
  );
}

export function ShareResaleSection({
  assetId,
  feeBps,
  feeLoading,
  purchasesPaused,
  chainUnavailable,
}: ShareResaleSectionProps): ReactElement {
  const { publicKey } = useStellarWallet();
  const { offers, loading, unavailable, reload } = useShareOffers(assetId);
  const [holding, setHolding] = useState<bigint | null>(null);
  const [busy, setBusy] = useState(false);
  const actionsDisabled = chainUnavailable || purchasesPaused || !publicKey;
  const ownOffer = publicKey ? offers.some(offer => offer.seller === publicKey) : false;

  useEffect(() => {
    if (!publicKey) {
      setHolding(null);
      return;
    }
    let cancelled = false;
    void fetchInvestorHoldings(assetId, publicKey)
      .then(balance => {
        if (!cancelled) setHolding(balance);
      })
      .catch(() => {
        if (!cancelled) setHolding(null);
      });
    return () => {
      cancelled = true;
    };
  }, [assetId, publicKey, offers]);

  async function offerShares(shares: bigint, priceStroops: bigint): Promise<void> {
    if (!publicKey || busy) return;
    setBusy(true);
    try {
      const { hash } = await createShareOffer({ seller: publicKey, assetId, shares, priceStroops }, publicKey);
      notification.success(<span>Offer opened. {txLink(hash)}</span>);
      reload();
    } catch (error: unknown) {
      notification.error(error instanceof Error ? error.message : "The offer could not be opened.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelOffer(): Promise<void> {
    if (!publicKey || busy) return;
    setBusy(true);
    try {
      const { hash } = await cancelShareOffer({ seller: publicKey, assetId }, publicKey);
      notification.success(<span>Offer cancelled. {txLink(hash)}</span>);
      reload();
    } catch (error: unknown) {
      notification.error(error instanceof Error ? error.message : "The offer could not be cancelled.");
    } finally {
      setBusy(false);
    }
  }

  async function buyOffer(seller: string, shares: bigint): Promise<void> {
    if (!publicKey || busy) return;
    setBusy(true);
    try {
      const { hash } = await fillShareOffer({ buyer: publicKey, seller, assetId, shares }, publicKey);
      notification.success(<span>Shares bought. {txLink(hash)}</span>);
      reload();
    } catch (error: unknown) {
      notification.error(error instanceof Error ? error.message : "The purchase could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-base-content">Share offers</h2>
      <p className="mt-1 text-sm font-medium leading-relaxed text-base-content/70">
        This sale is between two verified investors. It is not an exchange. The app does not hold the shares or the
        USDC.
      </p>
      {purchasesPaused ? <p className="mt-3 text-sm font-medium text-base-content/70">Purchases are paused.</p> : null}
      {chainUnavailable ? (
        <p className="mt-3 text-sm font-medium text-base-content/70">
          Offers are paused because the chain could not be read.
        </p>
      ) : null}
      {!publicKey ? (
        <p className="mt-3 text-sm font-medium text-base-content/70">Connect a wallet to buy or offer shares.</p>
      ) : null}
      {loading ? <p className="mt-4 text-sm font-medium text-base-content/60">Loading share offers</p> : null}
      {unavailable ? (
        <p className="mt-4 text-sm font-medium text-base-content/70">Share offers are unavailable right now.</p>
      ) : null}
      {!loading && !unavailable && offers.length === 0 ? (
        <p className="mt-4 text-sm font-medium text-base-content/70">No one is offering shares.</p>
      ) : null}
      {!loading && !unavailable ? (
        <div className="mt-4 space-y-3">
          {offers.map(offer => (
            <ShareOfferRow
              key={offer.seller}
              offer={offer}
              isSeller={offer.seller === publicKey}
              feeBps={feeBps}
              feeLoading={feeLoading}
              disabled={actionsDisabled}
              busy={busy}
              onCancel={cancelOffer}
              onBuy={buyOffer}
            />
          ))}
        </div>
      ) : null}
      {!unavailable && !ownOffer && holding !== null && holding > 0n ? (
        <ShareOfferForm holding={holding} disabled={actionsDisabled} busy={busy} onSubmit={offerShares} />
      ) : null}
    </section>
  );
}
