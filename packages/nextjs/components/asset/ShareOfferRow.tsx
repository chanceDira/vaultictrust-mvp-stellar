"use client";

import { type FormEvent, type ReactElement, useState } from "react";
import { shortenStellarAddress } from "~~/services/stellar/horizonClient";
import { formatCount } from "~~/utils/vaultic/liveTotals";
import { formatUsdcAmount } from "~~/utils/vaultic/protocolFee";
import { type ResaleOffer, resaleQuote, shareCount } from "~~/utils/vaultic/resaleOffer";

type ShareOfferRowProps = {
  offer: ResaleOffer;
  isSeller: boolean;
  feeBps: bigint | null;
  feeLoading: boolean;
  disabled: boolean;
  busy: boolean;
  onCancel: () => Promise<void>;
  onBuy: (seller: string, shares: bigint) => Promise<void>;
};

export function ShareOfferRow({
  offer,
  isSeller,
  feeBps,
  feeLoading,
  disabled,
  busy,
  onCancel,
  onBuy,
}: ShareOfferRowProps): ReactElement {
  const [sharesText, setSharesText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const requested = shareCount(sharesText);
  const quote =
    requested !== null && requested <= offer.shares && feeBps !== null
      ? resaleQuote(requested, offer.priceStroops, feeBps)
      : null;

  function submitBuy(event: FormEvent<HTMLFormElement>): void {
    void handleBuy(event);
  }

  async function handleBuy(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (requested === null || requested > offer.shares || quote === null) {
      setFormError("Enter a share count this offer still has.");
      return;
    }
    setFormError(null);
    await onBuy(offer.seller, requested);
    setSharesText("");
  }

  return (
    <article className="rounded-2xl border border-base-300 bg-base-100 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-base-content">{shortenStellarAddress(offer.seller)}</p>
        <p className="text-sm font-semibold tabular-nums text-base-content">
          {formatCount(offer.shares)} shares at {formatUsdcAmount(offer.priceStroops)} USDC
        </p>
      </div>
      {isSeller ? (
        <button
          className="btn btn-outline mt-4 rounded-xl font-bold"
          type="button"
          onClick={() => void onCancel()}
          disabled={busy}
        >
          {busy ? "Cancelling offer" : "Cancel offer"}
        </button>
      ) : (
        <form className="mt-4" onSubmit={submitBuy}>
          <label className="block text-sm font-semibold text-base-content/80">
            Shares to buy
            <input
              className="input input-bordered mt-1 w-full font-medium"
              inputMode="numeric"
              value={sharesText}
              onChange={event => setSharesText(event.target.value)}
              disabled={disabled || busy}
            />
          </label>
          {feeLoading ? (
            <p className="mt-3 text-sm font-medium text-base-content/60">Loading the protocol fee</p>
          ) : null}
          {!feeLoading && feeBps === null ? (
            <p className="mt-3 text-sm font-medium text-base-content/60">The protocol fee could not be loaded.</p>
          ) : null}
          {quote ? (
            <div className="mt-3 space-y-2 text-sm font-semibold">
              <div className="flex justify-between gap-3">
                <span className="text-base-content/70">You pay</span>
                <span className="tabular-nums">{formatUsdcAmount(quote.gross)} USDC</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-base-content/70">Protocol fee</span>
                <span className="tabular-nums">{formatUsdcAmount(quote.fee)} USDC</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-base-content/70">Seller receives</span>
                <span className="tabular-nums">{formatUsdcAmount(quote.net)} USDC</span>
              </div>
            </div>
          ) : null}
          {formError ? <p className="mt-3 text-sm font-medium text-error">{formError}</p> : null}
          <button
            className="btn btn-primary mt-4 rounded-xl font-bold"
            type="submit"
            disabled={disabled || busy || quote === null}
          >
            {busy ? "Sending purchase" : "Buy shares"}
          </button>
        </form>
      )}
    </article>
  );
}
