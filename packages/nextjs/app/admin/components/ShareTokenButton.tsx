"use client";

import { type ReactElement, useState } from "react";
import { getExplorerTxUrl } from "~~/scaffold.config";
import { getNetworkPassphrase } from "~~/services/stellar/horizonClient";
import { setShareToken } from "~~/services/stellar/investmentCalls";
import type { OnChainAsset } from "~~/types/stellar";
import { notification } from "~~/utils/vaultic";
import { shareContractId } from "~~/utils/vaultic/shareContract";

type ShareTokenButtonProps = {
  asset: OnChainAsset;
  publicKey: string;
};

export function ShareTokenButton({ asset, publicKey }: ShareTokenButtonProps): ReactElement | null {
  const [busy, setBusy] = useState(false);
  const issuer = asset.issuer;
  const canSet =
    asset.model.tag === "Fractional" &&
    Boolean(issuer) &&
    (asset.state.tag === "Tokenized" || asset.state.tag === "Closed" || asset.state.tag === "Relisted");

  async function allowOffers(): Promise<void> {
    if (!issuer || busy) return;
    setBusy(true);
    try {
      const token = shareContractId(asset.asset_code, issuer, getNetworkPassphrase());
      const { hash } = await setShareToken({ caller: publicKey, assetId: asset.asset_id, token }, publicKey);
      notification.success(
        <a href={getExplorerTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="font-bold text-primary">
          Share offers can use this asset. View the transaction.
        </a>,
      );
    } catch (error: unknown) {
      notification.error(error instanceof Error ? error.message : "The share token could not be set.");
    } finally {
      setBusy(false);
    }
  }

  if (!canSet) return null;

  return (
    <button className="btn btn-outline btn-sm" type="button" onClick={() => void allowOffers()} disabled={busy}>
      {busy ? "Setting share token" : "Allow share offers"}
    </button>
  );
}
