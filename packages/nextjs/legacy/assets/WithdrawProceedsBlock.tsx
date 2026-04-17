"use client";

import { useAccount } from "wagmi";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

const PAYMENT_TOKEN_DECIMALS = 6;

type WithdrawProceedsBlockProps = {
  assetId: bigint;
  assetOwner: string;
};

export function WithdrawProceedsBlock({ assetId, assetOwner }: WithdrawProceedsBlockProps) {
  const { address } = useAccount();
  const { data: withdrawableAmount } = useScaffoldReadContract({
    contractName: "VaulticInvestmentManager",
    functionName: "withdrawableProceeds",
    args: [assetId],
  });
  const { writeContractAsync: writeWithdraw, isMining: isWithdrawing } = useScaffoldWriteContract({
    contractName: "VaulticInvestmentManager",
  });

  const amount = (withdrawableAmount as bigint | undefined) ?? 0n;
  const amountFormatted = amount > 0n ? (Number(amount) / 10 ** PAYMENT_TOKEN_DECIMALS).toFixed(2) : null;
  const isAssetOwner = !!address && !!assetOwner && address.toLowerCase() === assetOwner.toLowerCase();
  const canWithdraw = isAssetOwner && amountFormatted !== null && Number(amountFormatted) > 0;

  const handleWithdraw = async () => {
    if (!canWithdraw) return;
    try {
      await writeWithdraw({ functionName: "withdrawProceeds", args: [assetId] });
      notification.success("Proceeds withdrawn");
    } catch (e: unknown) {
      console.error(e);
      notification.error(getParsedError(e) || "Withdraw failed.");
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-base-300 bg-base-100/50 p-4">
      <h4 className="font-semibold text-base-content flex items-center gap-2">
        <BanknotesIcon className="h-4 w-4 text-primary" />
        Proceeds
      </h4>
      <p className="mt-1 text-sm text-base-content/70">
        Withdrawable: {amountFormatted != null ? `$${amountFormatted}` : "—"} (payment token)
      </p>
      {!isAssetOwner && <p className="mt-1 text-xs text-base-content/60">Connect as asset owner to withdraw.</p>}
      <button
        type="button"
        className="btn btn-primary btn-sm mt-3 gap-2"
        disabled={!canWithdraw || isWithdrawing}
        onClick={handleWithdraw}
      >
        {isWithdrawing ? "Withdrawing..." : "Withdraw proceeds"}
      </button>
    </div>
  );
}
