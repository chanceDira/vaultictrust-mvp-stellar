"use client";

import { type FormEvent, type ReactElement, useState } from "react";
import { shareCount, usdcToStroops } from "~~/utils/vaultic/resaleOffer";

type ShareOfferFormProps = {
  holding: bigint;
  disabled: boolean;
  busy: boolean;
  onSubmit: (shares: bigint, priceStroops: bigint) => Promise<void>;
};

export function ShareOfferForm({ holding, disabled, busy, onSubmit }: ShareOfferFormProps): ReactElement {
  const [sharesText, setSharesText] = useState("");
  const [priceText, setPriceText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function submitOffer(event: FormEvent<HTMLFormElement>): void {
    void handleSubmit(event);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const shares = shareCount(sharesText);
    const priceStroops = usdcToStroops(priceText);
    if (shares === null || shares > holding) {
      setFormError("Enter a share count you hold.");
      return;
    }
    if (priceStroops === null) {
      setFormError("Enter a price above zero, with up to 7 decimal places.");
      return;
    }
    setFormError(null);
    await onSubmit(shares, priceStroops);
    setSharesText("");
    setPriceText("");
  }

  return (
    <form className="mt-4 rounded-2xl border border-base-300 bg-base-100 p-4" onSubmit={submitOffer}>
      <h3 className="text-base font-bold text-base-content">Offer shares</h3>
      <p className="mt-1 text-sm font-medium text-base-content/70">
        You approve this offer. A buyer signs the purchase. It lasts about 30 days.
      </p>
      <label className="mt-3 block text-sm font-semibold text-base-content/80">
        Shares
        <input
          className="input input-bordered mt-1 w-full font-medium"
          inputMode="numeric"
          value={sharesText}
          onChange={event => setSharesText(event.target.value)}
          disabled={disabled || busy}
        />
      </label>
      <label className="mt-3 block text-sm font-semibold text-base-content/80">
        Price per share (USDC)
        <input
          className="input input-bordered mt-1 w-full font-medium"
          inputMode="decimal"
          value={priceText}
          onChange={event => setPriceText(event.target.value)}
          disabled={disabled || busy}
        />
      </label>
      {formError ? <p className="mt-3 text-sm font-medium text-error">{formError}</p> : null}
      <button className="btn btn-primary mt-4 rounded-xl font-bold" type="submit" disabled={disabled || busy}>
        {busy ? "Sending offer" : "Offer shares"}
      </button>
    </form>
  );
}
