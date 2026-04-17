import { useCallback, useEffect, useState } from "react";
import { Spinner } from "../Spinner";
import { QuestionMarkCircleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { getHorizonServer } from "~~/services/stellar/horizonClient";
import { setupTrustline } from "~~/services/stellar/stellarService";
import { notification } from "~~/utils/scaffold-eth";

type TrustlineModalProps = {
  isOpen: boolean;
  onClose: () => void;
  publicKey: string;
  assetCode: string;
  issuer: string;
  onSuccess: () => void;
};

/**
 * TrustlineModal: Checks for an existing trustline and prompts the user to add it if missing.
 * Critical UX for Stellar RWA investment.
 */
export const TrustlineModal = ({ isOpen, onClose, publicKey, assetCode, issuer, onSuccess }: TrustlineModalProps) => {
  const [checking, setChecking] = useState(true);
  const [hasTrustline, setHasTrustline] = useState(false);
  const [busy, setBusy] = useState(false);

  const checkTrustline = useCallback(async () => {
    setChecking(true);
    const server = getHorizonServer();
    try {
      const account = await server.loadAccount(publicKey);
      const exists = account.balances.some((b: any) => b.asset_code === assetCode && b.asset_issuer === issuer);
      setHasTrustline(exists);
      if (exists) {
        // If they already have it, we can auto-continue or just show success
        setTimeout(onSuccess, 1000);
      }
    } catch (e) {
      console.error("Error checking trustline:", e);
    } finally {
      setChecking(false);
    }
  }, [publicKey, assetCode, issuer, onSuccess]);

  useEffect(() => {
    if (isOpen && publicKey && assetCode && issuer) {
      checkTrustline();
    }
  }, [isOpen, publicKey, assetCode, issuer, checkTrustline]);

  const handleAddTrustline = async () => {
    setBusy(true);
    try {
      await setupTrustline(publicKey, assetCode, issuer);
      notification.success(`Trustline for ${assetCode} established!`);
      setHasTrustline(true);
      onSuccess();
    } catch (e: any) {
      notification.error(`Failed to add trustline: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const renderStatusIcon = () => {
    if (checking) return <Spinner className="h-8 w-8 text-primary" />;
    if (hasTrustline) return <ShieldCheckIcon className="h-10 w-10 text-success" />;
    return <QuestionMarkCircleIcon className="h-10 w-10 text-primary" />;
  };

  const renderStatusText = () => {
    if (checking) return `Verifying your Stellar account permissions for ${assetCode}...`;
    if (hasTrustline) return `You are ready to receive ${assetCode} fractional tokens. Proceeding to investment...`;
    return `To hold ${assetCode} (RWA) tokens on Stellar, your account must first establish a "Trustline" to the issuer. This is a one-time setup for each asset.`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box relative bg-base-100 border border-base-300 shadow-2xl">
        <button onClick={onClose} className="btn btn-sm btn-circle absolute right-2 top-2">
          ✕
        </button>

        <div className="flex flex-col items-center text-center p-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            {renderStatusIcon()}
          </div>

          <h3 className="text-xl font-bold text-base-content uppercase tracking-tight">
            {checking ? "Checking Compliance..." : hasTrustline ? "Trustline Verified" : "Establish Trustline"}
          </h3>

          <p className="py-4 text-sm text-base-content/70">{renderStatusText()}</p>

          {!checking && !hasTrustline && (
            <div className="flex flex-col w-full gap-3 mt-4">
              <button
                onClick={handleAddTrustline}
                className={`btn btn-primary w-full gap-2 ${busy ? "loading" : ""}`}
                disabled={busy}
              >
                {busy ? "Signing..." : "Establish Trustline"}
                {!busy && <ShieldCheckIcon className="h-4 w-4" />}
              </button>
              <button onClick={onClose} className="btn btn-ghost btn-sm">
                Cancel
              </button>
            </div>
          )}

          {hasTrustline && (
            <p className="text-xs text-success font-medium animate-pulse mt-4 uppercase tracking-widest">
              Redirecting to secure transaction...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
