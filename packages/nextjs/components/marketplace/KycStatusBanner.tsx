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
      <div className="mb-8 flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2">
        <ShieldCheckIcon className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-medium text-emerald-600">Verified investor</span>
      </div>
    );
  }

  const isPending = status === "Pending";
  const isRejected = status === "Rejected";
  const isSuspended = status === "Suspended";
  const isNone = status === "None";

  return (
    <div
      className={`alert mb-10 animate-in fade-in slide-in-from-top-4 border shadow-lg ${
        isPending ? "alert-warning bg-yellow-500/5 border-yellow-500/30" : "alert-error bg-red-500/5 border-red-500/30"
      }`}
    >
      {isPending ? <ClockIcon className="h-6 w-6 text-yellow-500" /> : <ExclamationCircleIcon className="h-6 w-6" />}
      <div className="flex-1">
        <p className="font-semibold">
          {isPending
            ? "Verification pending"
            : isRejected
              ? "Verification rejected"
              : isSuspended
                ? "Account suspended"
                : "Verification required"}
        </p>
        <p className="text-sm text-base-content/70">
          {isPending
            ? "An admin is reviewing your submission."
            : isRejected
              ? "Contact support or submit a new application."
              : isSuspended
                ? "Your account is suspended for compliance reasons."
                : "Complete identity verification before you invest."}
        </p>
      </div>
      {isNone && (
        <Link href="/investor/kyc" className="btn btn-primary btn-sm rounded-xl">
          Verify identity
        </Link>
      )}
    </div>
  );
};
