import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { fetchUserRecord } from "~~/services/stellar/sorobanService";

type BannerTone = "primary" | "warning" | "error";

const TONE_CLASS: Record<BannerTone, string> = {
  primary: "bg-primary text-primary-content",
  warning: "bg-warning text-warning-content",
  error: "bg-error text-error-content",
};

export const GlobalKycBanner: React.FC = () => {
  const { isConnected, publicKey } = useStellarWallet();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConnected || !publicKey) {
      setStatus(null);
      return;
    }

    let active = true;
    setLoading(true);
    fetchUserRecord(publicKey)
      .then(record => {
        if (!active) return;
        const tag = typeof record?.status === "string" ? record.status : record?.status?.tag;
        setStatus(tag || "None");
      })
      .catch(() => {
        if (active) setStatus("None");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isConnected, publicKey]);

  if (!isConnected || loading || status === "Verified") return null;

  const isPending = status === "Pending";
  const isRejected = status === "Rejected";
  const isSuspended = status === "Suspended";
  let tone: BannerTone = "primary";
  let message = "Verify your identity before you buy shares.";
  if (isPending) {
    tone = "warning";
    message = "Your identity check is in review.";
  } else if (isRejected) {
    tone = "error";
    message = "Your identity check was rejected. Submit it again.";
  } else if (isSuspended) {
    tone = "error";
    message = "This account is suspended.";
  }

  return (
    <div role="status" className={TONE_CLASS[tone]}>
      <div className="mx-auto flex max-w-7xl items-center gap-2.5 px-4 py-2 sm:px-6">
        <ShieldExclamationIcon className="h-4 w-4 shrink-0" />
        <p className="min-w-0 flex-1 text-sm font-semibold leading-5">{message}</p>
        {!isPending && !isSuspended ? (
          <Link
            href="/investor/kyc"
            className="btn btn-xs shrink-0 rounded-lg border-0 bg-base-100 px-3 font-bold text-primary hover:bg-base-100"
          >
            Verify
          </Link>
        ) : null}
      </div>
    </div>
  );
};
