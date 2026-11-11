import { callContract } from "./sorobanCall";
import { safeScValToNative } from "./sorobanDecode";
import { simulateReadCall } from "./sorobanRead";
import { getContractIds } from "./sorobanRpc";
import { Address, nativeToScVal, xdr } from "@stellar/stellar-sdk";

export async function fetchYieldRound(assetId: number, roundIndex: number) {
  const { dividendManager } = getContractIds();
  if (!dividendManager) return null;

  try {
    const result = await simulateReadCall({
      contractId: dividendManager,
      method: "get_yield_round",
      args: [nativeToScVal(assetId, { type: "u32" }), nativeToScVal(roundIndex, { type: "u32" })],
    });
    return result ? safeScValToNative(result) : null;
  } catch {
    return null;
  }
}

export async function fetchClaimableYield(assetId: number, investor: string): Promise<bigint> {
  const { dividendManager } = getContractIds();
  if (!dividendManager) return 0n;

  const result = await simulateReadCall({
    contractId: dividendManager,
    method: "get_claimable_yield",
    args: [nativeToScVal(assetId, { type: "u32" }), new Address(investor).toScVal()],
  });
  return result ? ((safeScValToNative(result) as bigint) ?? 0n) : 0n;
}

export async function fetchYieldRoundCount(assetId: number): Promise<number> {
  const { dividendManager } = getContractIds();
  if (!dividendManager) return 0;

  const result = await simulateReadCall({
    contractId: dividendManager,
    method: "get_yield_round_count",
    args: [nativeToScVal(assetId, { type: "u32" })],
  });
  return result ? Number(safeScValToNative(result) ?? 0) : 0;
}

export async function depositYield(
  params: { assetId: number; amount: bigint; totalSharesOutstanding: bigint },
  callerPublicKey: string,
) {
  const { dividendManager } = getContractIds();
  if (!dividendManager) throw new Error("dividendManager contract not deployed");

  return callContract({
    contractId: dividendManager,
    method: "deposit_yield",
    args: [
      new Address(callerPublicKey).toScVal(),
      nativeToScVal(params.assetId, { type: "u32" }),
      nativeToScVal(params.amount, { type: "i128" }),
      nativeToScVal(params.totalSharesOutstanding, { type: "i128" }),
    ],
    callerPublicKey,
  });
}

export async function claimAllYield(assetId: number, callerPublicKey: string) {
  const { dividendManager } = getContractIds();
  if (!dividendManager) throw new Error("dividendManager contract not deployed");

  return callContract({
    contractId: dividendManager,
    method: "claim_all_yield",
    args: [new Address(callerPublicKey).toScVal(), nativeToScVal(assetId, { type: "u32" })],
    callerPublicKey,
  });
}
