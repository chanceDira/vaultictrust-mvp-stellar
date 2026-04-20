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
    <div className="modal modal-open backdrop-blur-sm bg-black/60">
      <div className="modal-box relative bg-base-100/80 backdrop-blur-md border border-base-300 shadow-2xl rounded-3xl p-8 max-w-md">
        <button
          onClick={onClose}
          className="btn btn-sm btn-circle absolute right-4 top-4 hover:rotate-90 transition-transform"
        >
          ✕
        </button>

        <div className="flex flex-col items-center text-center p-4">
          <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20 shadow-inner">
            {renderStatusIcon()}
          </div>

          <h3 className="text-3xl font-black text-base-content uppercase tracking-tighter italic">
            {checking ? "Verifying..." : hasTrustline ? "Verified" : "Trustline"}
          </h3>

          <p className="py-4 text-sm text-base-content/70">{renderStatusText()}</p>

          {!checking && !hasTrustline && (
            <div className="flex flex-col w-full gap-4 mt-6">
              <button
                onClick={handleAddTrustline}
                className={`btn btn-primary btn-lg w-full gap-3 stellar-glow shadow-lg shadow-primary/20 rounded-2xl font-black uppercase tracking-widest text-xs ${busy ? "loading" : ""}`}
                disabled={busy}
              >
                {busy ? "Authenticating..." : "Approve Trustline"}
                {!busy && <ShieldCheckIcon className="h-5 w-5" />}
              </button>
              <button
                onClick={onClose}
                className="btn btn-ghost btn-md font-bold uppercase tracking-widest text-[10px] opacity-50 hover:opacity-100"
              >
                Decline
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
