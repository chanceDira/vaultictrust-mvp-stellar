"use client";

import { useState } from "react";
import { useAccount, useConfig, useWriteContract } from "wagmi";
import { getPublicClient } from "wagmi/actions";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

const ERC20_APPROVE_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

type InvestmentPanelProps = {
  assetId: bigint;
  pricePerShare: bigint;
  assetName: string;
};

export function InvestmentPanel({ assetId, pricePerShare, assetName }: InvestmentPanelProps) {
  const { address } = useAccount();
  const config = useConfig();
  const [shareAmount, setShareAmount] = useState("");
  const { data: investmentManagerInfo } = useDeployedContractInfo({
    contractName: "VaulticInvestmentManager",
  });
  const shareNum = shareAmount ? Math.max(0, Math.floor(Number(shareAmount))) : 0;
  const shareAmountBigInt = BigInt(shareNum);
  const paymentAmount = shareAmountBigInt * pricePerShare;

  const { data: availableSharesRaw } = useScaffoldReadContract({
    contractName: "VaulticInvestmentManager",
    functionName: "availableShares",
    args: [assetId],
  });
  const { data: quoteRaw } = useScaffoldReadContract({
    contractName: "VaulticInvestmentManager",
    functionName: "quotePurchase",
    args: shareAmountBigInt > 0n ? [assetId, shareAmountBigInt] : undefined,
  });
  const { data: paymentTokenAddress } = useScaffoldReadContract({
    contractName: "VaulticInvestmentManager",
    functionName: "paymentToken",
  });

  const { writeContractAsync: writeApprove } = useWriteContract();
  const { writeContractAsync: writePurchase, isMining } = useScaffoldWriteContract({
    contractName: "VaulticInvestmentManager",
  });

  const availableShares = (availableSharesRaw as bigint | undefined) ?? 0n;
  const availableNum = Number(availableShares);
  const exceedsAvailable = availableNum > 0 && shareNum > availableNum;
  const quote = quoteRaw as [bigint, bigint, bigint] | undefined;
  const [grossCost, fee] = quote ?? [paymentAmount, 0n];
  const grossDisplay = quote != null ? grossCost : paymentAmount;
  const PAYMENT_DECIMALS = 6;

  const handlePurchase = async () => {
    if (!address || !investmentManagerInfo?.address) {
      notification.error("Connect your wallet");
      return;
    }
    if (shareAmountBigInt <= 0n) {
      notification.error("Enter a share amount");
      return;
    }
    if (availableNum > 0 && shareNum > availableNum) {
      notification.error(`Only ${availableNum} shares remaining`);
      return;
    }

    let loadingId: string | undefined;
    try {
      if (paymentAmount > 0n && paymentTokenAddress) {
        const spender = investmentManagerInfo.address as `0x${string}`;
        const tokenAddress = paymentTokenAddress as `0x${string}`;
        const publicClient = getPublicClient(config);

        // Some tokens (e.g. USDC) require resetting allowance to 0 before setting a new value
        loadingId = notification.loading("Step 1 of 3: Resetting allowance. Confirm in your wallet.");
        const resetHash = await writeApprove({
          address: tokenAddress,
          abi: ERC20_APPROVE_ABI,
          functionName: "approve",
          args: [spender, 0n],
        });
        if (loadingId) {
          notification.remove(loadingId);
          loadingId = undefined;
        }
        if (publicClient && resetHash) {
          loadingId = notification.loading("Waiting for step 1 to confirm on-chain…");
          await publicClient.waitForTransactionReceipt({ hash: resetHash });
          if (loadingId) {
            notification.remove(loadingId);
            loadingId = undefined;
          }
        }

        loadingId = notification.loading("Step 2 of 3: Approve payment amount. Confirm in your wallet.");
        const approveHash = await writeApprove({
          address: tokenAddress,
          abi: ERC20_APPROVE_ABI,
          functionName: "approve",
          args: [spender, paymentAmount],
        });
        if (loadingId) {
          notification.remove(loadingId);
          loadingId = undefined;
        }
        // Wait for approval to be mined so purchase sees the allowance on-chain
        if (publicClient && approveHash) {
          loadingId = notification.loading("Waiting for step 2 to confirm on-chain…");
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          if (loadingId) {
            notification.remove(loadingId);
            loadingId = undefined;
          }
        }
        notification.success("Step 2 done. Step 3 of 3: Confirm the purchase in your wallet.");
      }

      if (loadingId) {
        notification.remove(loadingId);
        loadingId = undefined;
      }
      await writePurchase({
        functionName: "purchaseShares",
        args: [assetId, shareAmountBigInt, paymentAmount],
      });
      notification.success("Purchase complete. Your shares are in your wallet.");
      setShareAmount("");
    } catch (e: unknown) {
      if (loadingId) {
        notification.remove(loadingId);
      }
      console.error(e);
      const message = getParsedError(e);
      notification.error(message || "Purchase failed.");
    }
  };

  const pricePerShareFormatted = pricePerShare > 0n ? (Number(pricePerShare) / 1e6).toFixed(2) : "0";
  const remainingSharesLabel = availableSharesRaw !== undefined ? availableNum.toLocaleString() : "—";

  return (
    <div className="rounded-lg bg-base-200/60 p-4">
      <h4 className="font-semibold text-base-content">Buy shares</h4>
      <p className="mt-1 text-sm text-base-content/70">
        {assetName} · ${pricePerShareFormatted} per share
      </p>
      <p className="mt-0.5 text-xs text-base-content/60">{remainingSharesLabel} shares remaining</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[120px]">
          <label className="text-xs font-medium text-base-content/70">Shares</label>
          <input
            type="number"
            min="1"
            max={availableNum > 0 ? availableNum : undefined}
            value={shareAmount}
            onChange={e => setShareAmount(e.target.value)}
            placeholder="0"
            disabled={!address}
            className={`input input-bordered input-sm w-full mt-1 ${exceedsAvailable ? "input-error" : ""}`}
          />
          {exceedsAvailable && <p className="mt-0.5 text-xs text-error">Max {availableNum} shares</p>}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!address || shareAmountBigInt <= 0n || isMining || exceedsAvailable}
          onClick={handlePurchase}
        >
          {isMining ? "Confirming…" : "Buy shares"}
        </button>
      </div>
      {shareAmountBigInt > 0n && (
        <div className="mt-2 space-y-0.5 text-xs text-base-content/60">
          <p>You pay: ${(Number(grossDisplay) / 10 ** PAYMENT_DECIMALS).toFixed(2)} (payment token)</p>
          {quote != null && fee > 0n && <p>Protocol fee: ${(Number(fee) / 10 ** PAYMENT_DECIMALS).toFixed(2)}</p>}
          <p className="mt-1.5 text-base-content/50">
            You will be asked to approve 3 transactions in your wallet (reset allowance, approve amount, then purchase).
            This is normal for payment tokens like USDC.
          </p>
        </div>
      )}
    </div>
  );
}
