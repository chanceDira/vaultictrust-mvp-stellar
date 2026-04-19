import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ExclamationTriangleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
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
            // Success: record.status is an enum object or symbol string
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
      className={`w-full py-2 px-4 flex items-center justify-center gap-4 transition-all animate-in slide-in-from-top duration-500 ${
        isPending ? "bg-yellow-500/10 border-b border-yellow-500/20" : "bg-primary/10 border-b border-primary/20"
      }`}
    >
      {isPending ? (
        <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
      ) : (
        <ShieldCheckIcon className="h-4 w-4 text-primary" />
      )}

      <p className="text-xs font-semibold uppercase tracking-widest text-base-content/80">
        {isPending
          ? "Your KYC application is currently under review. Some features may be restricted."
          : "Verification Required: Please complete your KYC to participate in RWA investments."}
      </p>

      {!isPending && (
        <Link
          href="/investor/kyc"
          className="btn btn-primary btn-xs rounded-full px-4 hover:scale-105 transition-transform"
        >
          Verify Now
        </Link>
      )}
    </div>
  );
};
