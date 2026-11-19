"use client";

import type { ReactElement } from "react";
import { ReceiptPercentIcon } from "@heroicons/react/24/outline";
import { useProtocolFee } from "~~/hooks/vaultic/useProtocolFee";
import { formatFeePercent } from "~~/utils/vaultic/protocolFee";

export function HeroFeeNote(): ReactElement | null {
  const { bps } = useProtocolFee(true);
  if (bps === null) return null;
  return (
    <div className="landing-float absolute -bottom-6 -left-4 hidden items-center gap-3 rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-xl sm:flex">
      <ReceiptPercentIcon className="h-6 w-6 shrink-0 text-primary" aria-hidden />
      <div>
        <p className="text-sm font-bold text-base-content">Protocol fee {formatFeePercent(bps)}</p>
        <p className="text-xs font-semibold text-base-content/60">Shown before your wallet opens</p>
      </div>
    </div>
  );
}
