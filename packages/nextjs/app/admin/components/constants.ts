import {
  ArchiveBoxIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  CubeTransparentIcon,
  FireIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { AssetStateKey, KycStatusTag } from "~~/types/stellar";

export const STATE_CONFIG: Record<AssetStateKey, { label: string; color: string; icon: React.ElementType }> = {
  Pending: { label: "Pending", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", icon: ClockIcon },
  Active: { label: "Active", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircleIcon },
  Tokenized: {
    label: "Tokenized",
    color: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    icon: CubeTransparentIcon,
  },
  Closed: { label: "Closed", color: "text-red-400 bg-red-400/10 border-red-400/20", icon: XCircleIcon },
  Relisted: { label: "Relisted", color: "text-blue-400 bg-blue-400/10 border-blue-400/20", icon: ArrowPathIcon },
  Archived: {
    label: "Archived",
    color: "text-base-content/40 bg-base-300/30 border-base-300",
    icon: ArchiveBoxIcon,
  },
  Burned: { label: "Burned", color: "text-orange-400 bg-orange-400/10 border-orange-400/20", icon: FireIcon },
};

export const KYC_CONFIG: Record<KycStatusTag, { label: string; color: string }> = {
  None: { label: "None", color: "text-base-content/40 bg-base-300/20" },
  Pending: { label: "Pending", color: "text-yellow-400 bg-yellow-400/10" },
  Verified: { label: "Verified", color: "text-emerald-400 bg-emerald-400/10" },
  Rejected: { label: "Rejected", color: "text-red-400 bg-red-400/10" },
  Suspended: { label: "Suspended", color: "text-orange-400 bg-orange-400/10" },
};
