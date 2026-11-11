import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { fetchUserRecord } from "~~/services/stellar/sorobanService";

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

  return (
    <div
      role="status"
      className={`border-b ${isPending ? "border-warning/30 bg-warning/10" : "border-primary/25 bg-primary/10"}`}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-1.5 sm:px-6">
        <p className="min-w-0 flex-1 text-sm font-medium leading-5 text-base-content">
          {isPending
            ? "Your identity check is in review."
            : "Verify your identity before you buy shares."}
        </p>
        {!isPending ? (
          <Link href="/investor/kyc" className="btn btn-primary btn-xs shrink-0 rounded-lg px-3 font-semibold">
            Verify
          </Link>
        ) : null}
      </div>
    </div>
  );
};
