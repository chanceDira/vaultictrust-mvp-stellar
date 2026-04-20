"use client";

import Link from "next/link";
import { ClockIcon, ExclamationCircleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

interface KycStatusBannerProps {
  kycRecord: any;
}

export const KycStatusBanner = ({ kycRecord }: KycStatusBannerProps) => {
  if (!kycRecord) return null;

  const status = typeof kycRecord.status === "string" ? kycRecord.status : kycRecord.status?.tag;

  if (status === "Verified") {
    return (
      <div className="flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 w-fit">
        <ShieldCheckIcon className="h-4 w-4 text-emerald-500" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-500">
          Verified Investor Profile
        </span>
      </div>
    );
  }

  const isPending = status === "Pending";
  const isRejected = status === "Rejected";
  const isSuspended = status === "Suspended";
  const isNone = status === "None";

  return (
    <div
      className={`alert mb-10 shadow-lg border animate-in fade-in slide-in-from-top-4 ${
        isPending ? "alert-warning bg-yellow-500/5 border-yellow-500/30" : "alert-error bg-red-500/5 border-red-500/30"
      }`}
    >
      {isPending ? <ClockIcon className="h-6 w-6 text-yellow-500" /> : <ExclamationCircleIcon className="h-6 w-6" />}
      <div className="flex-1">
        <p className="font-bold">
          {isPending
            ? "Verification Pending"
            : isRejected
              ? "Verification Rejected"
              : isSuspended
                ? "Account Suspended"
                : "Identity Verification Required"}
        </p>
        <p className="text-sm text-base-content/70">
          {isPending
            ? "Your KYC application is being reviewed by the Vaultic compliance team."
            : isRejected
              ? "Your application was rejected. Please contact support or resubmit."
              : isSuspended
                ? "Your account has been suspended for compliance reasons."
                : "To participate in RWA tokenization, you must first complete your identity verification."}
        </p>
      </div>
      {isNone && (
        <Link href="/investor/kyc" className="btn btn-primary btn-sm rounded-xl">
          Verify Identity
        </Link>
      )}
    </div>
  );
};
