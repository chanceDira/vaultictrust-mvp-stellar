"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import { mutate } from "swr";
import { usePurchasesPaused } from "~~/hooks/vaultic/usePurchasesPaused";
import { setPurchasesPaused } from "~~/services/stellar/sorobanService";
import { notification } from "~~/utils/vaultic";

const PAUSE_KEY = "purchases-paused";

type PurchasesPauseControlProps = {
  publicKey: string;
};

export function PurchasesPauseControl({ publicKey }: PurchasesPauseControlProps): ReactElement {
  const { paused, loading } = usePurchasesPaused();
  const [busy, setBusy] = useState(false);
  let status = "The pause state could not be read.";
  if (loading) status = "Loading the pause state";
  else if (paused === true) status = "New purchases are paused.";
  else if (paused === false) status = "New purchases are open.";

  const togglePause = async () => {
    const nextPaused = paused !== true;
    setBusy(true);
    const notifId = notification.loading(nextPaused ? "Pausing purchases" : "Resuming purchases");
    try {
      await setPurchasesPaused(nextPaused, publicKey);
      await mutate(PAUSE_KEY);
      notification.success(nextPaused ? "Purchases paused" : "Purchases resumed");
    } catch (err: unknown) {
      notification.error(`Failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setBusy(false);
      notification.remove(notifId);
    }
  };

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100/40 p-5">
      <h3 className="text-lg font-semibold text-base-content">Purchases</h3>
      <p className="mt-1 text-sm font-medium text-base-content/70">{status}</p>
      <button
        className="btn btn-outline mt-4 rounded-xl"
        type="button"
        onClick={togglePause}
        disabled={loading || busy}
      >
        {paused === true ? "Resume purchases" : "Pause purchases"}
      </button>
    </div>
  );
}
