import { callContract } from "./sorobanCall";
import { safeScValToNative } from "./sorobanDecode";
import { simulateReadCall } from "./sorobanRead";
import { getContractIds, getRpcServer } from "./sorobanRpc";
import { Address, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import { TESTNET_USDC_CONTRACT } from "~~/scaffold.config";
import { parseProtocolFeeBps } from "~~/utils/vaultic/protocolFee";

export async function fetchPool(assetId: number): Promise<any> {
  const { investmentManager } = getContractIds();
  if (!investmentManager) return null;

  const result = await simulateReadCall({
    contractId: investmentManager,
    method: "get_pool",
    args: [nativeToScVal(assetId, { type: "u32" })],
  });
  return result ? safeScValToNative(result) : null;
}

export async function fetchAvailableShares(assetId: number): Promise<bigint> {
  const { investmentManager } = getContractIds();
  if (!investmentManager) return 0n;

  const result = await simulateReadCall({
    contractId: investmentManager,
    method: "available_shares",
    args: [nativeToScVal(assetId, { type: "u32" })],
  });
  return result ? ((safeScValToNative(result) as bigint) ?? 0n) : 0n;
}

export async function fetchQuotePurchase(
  assetId: number,
  shareAmount: bigint,
): Promise<{ gross: bigint; fee: bigint; net: bigint }> {
  const { investmentManager } = getContractIds();
  if (!investmentManager) return { gross: 0n, fee: 0n, net: 0n };

  const result = await simulateReadCall({
    contractId: investmentManager,
    method: "quote_purchase",
    args: [nativeToScVal(assetId, { type: "u32" }), nativeToScVal(shareAmount, { type: "i128" })],
  });
  if (!result) return { gross: 0n, fee: 0n, net: 0n };
  const decoded = safeScValToNative(result) as [bigint, bigint, bigint] | null;
  if (!decoded) return { gross: 0n, fee: 0n, net: 0n };
  const [gross, fee, net] = decoded;
  return { gross, fee, net };
}

export async function fetchWithdrawableProceeds(assetId: number): Promise<bigint> {
  const { investmentManager } = getContractIds();
  if (!investmentManager) return 0n;
  const result = await simulateReadCall({
    contractId: investmentManager,
    method: "get_withdrawable_proceeds",
    args: [nativeToScVal(assetId, { type: "u32" })],
  });
  return result ? ((safeScValToNative(result) as bigint) ?? 0n) : 0n;
}

export async function fetchInvestorHoldings(assetId: number, investor: string): Promise<bigint> {
  const { investmentManager } = getContractIds();
  if (!investmentManager) return 0n;

  const result = await simulateReadCall({
    contractId: investmentManager,
    method: "get_investor_holdings",
    args: [nativeToScVal(assetId, { type: "u32" }), new Address(investor).toScVal()],
  });
  return result ? ((safeScValToNative(result) as bigint) ?? 0n) : 0n;
}

export async function tokenizeAsset(
  params: {
    assetId: number;
    totalShares: bigint;
    pricePerShare: bigint;
    investorCap: bigint;
    rwaIssuer: string;
    rwaAssetCode: string;
  },
  callerPublicKey: string,
) {
  const { investmentManager } = getContractIds();
  if (!investmentManager) throw new Error("investmentManager contract not deployed");

  return callContract({
    contractId: investmentManager,
    method: "tokenize_asset",
    args: [
      new Address(callerPublicKey).toScVal(),
      nativeToScVal(params.assetId, { type: "u32" }),
      nativeToScVal(params.totalShares, { type: "i128" }),
      nativeToScVal(params.pricePerShare, { type: "i128" }),
      nativeToScVal(params.investorCap, { type: "i128" }),
      new Address(params.rwaIssuer).toScVal(),
      nativeToScVal(params.rwaAssetCode, { type: "string" }),
    ],
    callerPublicKey,
  });
}

export async function purchaseWholeAsset(params: { buyer: string; assetId: number }, callerPublicKey: string) {
  const { investmentManager } = getContractIds();
  if (!investmentManager) throw new Error("investmentManager contract not deployed");

  return callContract({
    contractId: investmentManager,
    method: "purchase_whole_asset",
    args: [new Address(params.buyer).toScVal(), nativeToScVal(params.assetId, { type: "u32" })],
    callerPublicKey,
  });
}

export async function purchaseShares(
  params: { investor: string; assetId: number; shareAmount: bigint },
  callerPublicKey: string,
) {
  const { investmentManager } = getContractIds();
  if (!investmentManager) throw new Error("investmentManager contract not deployed");

  return callContract({
    contractId: investmentManager,
    method: "purchase_shares",
    args: [
      new Address(params.investor).toScVal(),
      nativeToScVal(params.assetId, { type: "u32" }),
      nativeToScVal(params.shareAmount, { type: "i128" }),
    ],
    callerPublicKey,
  });
}

export async function withdrawProceeds(assetId: number, callerPublicKey: string) {
  const { investmentManager } = getContractIds();
  if (!investmentManager) throw new Error("investmentManager contract not deployed");

  return callContract({
    contractId: investmentManager,
    method: "withdraw_proceeds",
    args: [nativeToScVal(assetId, { type: "u32" })],
    callerPublicKey,
  });
}

export async function sweepFees(callerPublicKey: string) {
  const { investmentManager } = getContractIds();
  if (!investmentManager) throw new Error("investmentManager contract not deployed");

  return callContract({
    contractId: investmentManager,
    method: "sweep_fees",
    args: [new Address(callerPublicKey).toScVal()],
    callerPublicKey,
  });
}

export async function increaseAllowance(amount: bigint, callerPublicKey: string, spenderOverride?: string) {
  const { investmentManager } = getContractIds();
  const spender = spenderOverride || investmentManager;

  if (!spender) throw new Error("Spender contract not targetable");

  const server = getRpcServer();
  const latestLedger = await server.getLatestLedger();
  const expirationLedger = latestLedger.sequence + 1000;

  return callContract({
    contractId: TESTNET_USDC_CONTRACT,
    method: "approve",
    args: [
      new Address(callerPublicKey).toScVal(),
      new Address(spender).toScVal(),
      nativeToScVal(amount, { type: "i128" }),
      nativeToScVal(expirationLedger, { type: "u32" }),
    ],
    callerPublicKey,
  });
}

export async function fetchProtocolFeeBps(): Promise<bigint | null> {
  const { investmentManager } = getContractIds();
  if (!investmentManager) return null;

  const instance: unknown = await getRpcServer().getContractInstance(investmentManager);
  return parseProtocolFeeBps(instance);
}

export async function fetchTotalFees(): Promise<bigint> {
  const { investmentManager } = getContractIds();
  if (!investmentManager) return 0n;

  const result = await simulateReadCall({
    contractId: investmentManager,
    method: "accumulated_fees",
    args: [],
  });
  return result ? ((safeScValToNative(result) as bigint) ?? 0n) : 0n;
}
