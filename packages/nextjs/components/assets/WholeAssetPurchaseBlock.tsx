"use client";

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

const PAYMENT_DECIMALS = 6;

type WholeAssetPurchaseBlockProps = {
  assetId: bigint;
  valuation: bigint;
  assetName: string;
};

export function WholeAssetPurchaseBlock({ assetId, valuation, assetName }: WholeAssetPurchaseBlockProps) {
  const { address } = useAccount();
  const config = useConfig();
  const { data: investmentManagerInfo } = useDeployedContractInfo({
    contractName: "VaulticInvestmentManager",
  });
  const { data: quoteRaw } = useScaffoldReadContract({
    contractName: "VaulticInvestmentManager",
    functionName: "quoteWholePurchase",
    args: [assetId],
  });
  const { data: paymentTokenAddress } = useScaffoldReadContract({
    contractName: "VaulticInvestmentManager",
    functionName: "paymentToken",
  });

  const { writeContractAsync: writeApprove } = useWriteContract();
  const { writeContractAsync: writePurchase, isMining } = useScaffoldWriteContract({
    contractName: "VaulticInvestmentManager",
  });

  const quote = quoteRaw as [bigint, bigint, bigint] | undefined;
  const [grossPayment, fee] = quote ?? [valuation, 0n];
  const grossDisplay = grossPayment > 0n ? grossPayment : valuation;

  const handlePurchase = async () => {
    if (!address || !investmentManagerInfo?.address) {
      notification.error("Connect your wallet");
      return;
    }
    if (grossPayment <= 0n) {
      notification.error("Asset has no valuation");
      return;
    }

    let loadingId: string | undefined;
    try {
      if (paymentTokenAddress) {
        const spender = investmentManagerInfo.address as `0x${string}`;
        const tokenAddress = paymentTokenAddress as `0x${string}`;
        const publicClient = getPublicClient(config);

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
          args: [spender, grossPayment],
        });
        if (loadingId) {
          notification.remove(loadingId);
          loadingId = undefined;
        }
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
        functionName: "purchaseWholeAsset",
        args: [assetId],
      });
      notification.success("Purchase complete. You now own this asset.");
    } catch (e: unknown) {
      if (loadingId) {
        notification.remove(loadingId);
      }
      console.error(e);
      const message = getParsedError(e);
      notification.error(message || "Purchase failed.");
    }
  };

  const valuationFormatted = grossDisplay > 0n ? (Number(grossDisplay) / 10 ** PAYMENT_DECIMALS).toFixed(2) : "0";

  return (
    <div className="rounded-lg bg-base-200/60 p-4">
      <h4 className="font-semibold text-base-content">Buy whole asset</h4>
      <p className="mt-1 text-sm text-base-content/70">{assetName} · Full valuation</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[120px]">
          <p className="text-xs text-base-content/60">
            You pay: ${valuationFormatted} (payment token) for 100% ownership.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!address || grossPayment <= 0n || isMining}
          onClick={handlePurchase}
        >
          {isMining ? "Confirming…" : "Buy whole asset"}
        </button>
      </div>
      <div className="mt-2 space-y-0.5 text-xs text-base-content/60">
        <p>Total: ${valuationFormatted} (payment token)</p>
        {quote != null && fee > 0n && <p>Protocol fee: ${(Number(fee) / 10 ** PAYMENT_DECIMALS).toFixed(2)}</p>}
        <p className="mt-1.5 text-base-content/50">
          You will be asked to approve 3 transactions in your wallet (reset allowance, approve amount, then purchase).
        </p>
      </div>
    </div>
  );
}
