"use client";

import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

type Variant = "danger" | "warning";

type Props = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: Variant;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

const VARIANT_STYLES: Record<Variant, { btn: string; icon: string }> = {
  danger: { btn: "btn-error", icon: "text-error" },
  warning: { btn: "btn-warning", icon: "text-warning" },
};

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel,
  variant = "danger",
  isLoading = false,
  onConfirm,
  onClose,
}: Readonly<Props>) {
  if (!isOpen) return null;

  const styles = VARIANT_STYLES[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-base-100 border border-base-300 p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center gap-4">
          <div className={`p-3 rounded-full bg-base-300/50`}>
            <ExclamationTriangleIcon className={`h-7 w-7 ${styles.icon}`} />
          </div>
          <div>
            <h3 className="font-bold text-base mb-1">{title}</h3>
            <p className="text-sm text-base-content/60">{description}</p>
          </div>
          <div className="flex gap-3 w-full mt-2">
            <button className="btn btn-outline btn-sm flex-1" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button className={`btn ${styles.btn} btn-sm flex-1`} onClick={onConfirm} disabled={isLoading}>
              {isLoading ? <span className="loading loading-bars loading-xs" /> : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
