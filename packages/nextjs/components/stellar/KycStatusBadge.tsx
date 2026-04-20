import React from "react";
import { ClockIcon, ExclamationCircleIcon, NoSymbolIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

export type KycStatus = "None" | "Pending" | "Verified" | "Rejected" | "Suspended";

interface KycStatusBadgeProps {
  status: KycStatus | number;
  showIcon?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  None: {
    label: "Unverified",
    color: "text-base-content/40",
    bg: "bg-base-content/5",
    icon: ExclamationCircleIcon,
  },
  Pending: {
    label: "Pending",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    icon: ClockIcon,
  },
  Verified: {
    label: "Verified",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    icon: ShieldCheckIcon,
  },
  Rejected: {
    label: "Rejected",
    color: "text-red-500",
    bg: "bg-red-500/10",
    icon: NoSymbolIcon,
  },
  Suspended: {
    label: "Suspended",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    icon: ExclamationCircleIcon,
  },
};

const MAP_INT_STATUS: Record<number, KycStatus> = {
  0: "None",
  1: "Pending",
  2: "Verified",
  3: "Rejected",
  4: "Suspended",
};

export const KycStatusBadge: React.FC<KycStatusBadgeProps> = ({ status, showIcon = true, className = "" }) => {
  const statusKey = typeof status === "number" ? MAP_INT_STATUS[status] || "None" : status;
  const config = STATUS_CONFIG[statusKey] || STATUS_CONFIG.None;
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-current/10 text-xs font-bold transition-all ${config.bg} ${config.color} ${className}`}
    >
      {showIcon && <Icon className="h-3.5 w-3.5 stroke-[2.5]" />}
      <span className="uppercase tracking-wider">{config.label}</span>
    </div>
  );
};
