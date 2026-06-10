import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, ClockIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { fetchUserRecord } from "~~/services/stellar/sorobanService";

export const GlobalKycBanner: React.FC = () => {
  const { isConnected, publicKey } = useStellarWallet();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConnected && publicKey) {
      setLoading(true);
      fetchUserRecord(publicKey)
        .then(record => {
          if (record) {
            const tag = typeof record.status === "string" ? record.status : record.status?.tag;
            setStatus(tag || "None");
          } else {
            setStatus("None");
          }
        })
        .catch(err => {
          console.error("KYC check failed:", err);
          setStatus("None");
        })
        .finally(() => setLoading(false));
    } else {
      setStatus(null);
    }
  }, [isConnected, publicKey]);

  if (!isConnected || loading || status === "Verified") return null;

  const isPending = status === "Pending";

  return (
    <div
      role="alert"
      className={`relative overflow-hidden border-b ${
        isPending
          ? "border-warning/40 bg-gradient-to-r from-warning/20 via-warning/10 to-warning/5"
          : "border-primary/40 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 w-1 ${isPending ? "bg-warning" : "bg-primary"}`}
        aria-hidden
      />

      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-3.5 lg:px-8">
        <div className="flex min-w-0 items-start gap-2.5 sm:items-center sm:gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${
              isPending ? "bg-warning/20 text-warning" : "bg-primary/20 text-primary"
            }`}
          >
            {isPending ? <ClockIcon className="h-5 w-5" /> : <ShieldExclamationIcon className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-base-content">
              {isPending ? "Verification in progress" : "Identity verification required"}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-base-content/65 sm:text-sm">
              {isPending
                ? "Your documents are under review. Marketplace investing unlocks after approval."
                : "Complete KYC to invest in tokenized assets on the marketplace."}
            </p>
          </div>
        </div>

        {!isPending && (
          <Link
            href="/investor/kyc"
            className="btn btn-primary btn-sm w-full shrink-0 gap-2 rounded-xl px-5 sm:w-auto stellar-glow"
          >
            Verify now
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
};
