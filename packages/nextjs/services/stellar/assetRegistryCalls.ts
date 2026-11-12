import { callContract } from "./sorobanCall";
import { normalizeAssetRecord, safeScValToNative } from "./sorobanDecode";
import { simulateReadCall } from "./sorobanRead";
import { getContractIds } from "./sorobanRpc";
import { Address, nativeToScVal, xdr } from "@stellar/stellar-sdk";

export async function fetchTotalAssetsResult(): Promise<number | null> {
  const { registry } = getContractIds();
  if (!registry) return null;

  const result = await simulateReadCall({
    contractId: registry,
    method: "total_assets",
    args: [],
  });
  if (!result) return null;
  const total = Number(safeScValToNative(result));
  if (!Number.isInteger(total) || total < 0) return null;
  return total;
}

export async function fetchTotalAssets(): Promise<number> {
  return (await fetchTotalAssetsResult()) ?? 0;
}

export async function fetchAsset(assetId: number): Promise<any> {
  const { registry } = getContractIds();
  if (!registry) return null;

  const result = await simulateReadCall({
    contractId: registry,
    method: "get_asset",
    args: [nativeToScVal(assetId, { type: "u32" })],
  });
  return result ? normalizeAssetRecord(safeScValToNative(result)) : null;
}

export async function fetchAssetsByOwner(ownerAddress: string): Promise<number[]> {
  const { registry } = getContractIds();
  if (!registry) return [];

  const result = await simulateReadCall({
    contractId: registry,
    method: "get_assets_by_owner",
    args: [new Address(ownerAddress).toScVal()],
  });
  return result ? ((safeScValToNative(result) as number[]) ?? []) : [];
}

export async function fetchFundingProgress(assetId: number): Promise<{ sold: bigint; total: bigint }> {
  const { registry } = getContractIds();
  if (!registry) return { sold: 0n, total: 0n };

  const result = await simulateReadCall({
    contractId: registry,
    method: "get_funding_progress",
    args: [nativeToScVal(assetId, { type: "u32" })],
  });
  if (!result) return { sold: 0n, total: 0n };
  const decoded = safeScValToNative(result) as [bigint, bigint] | null;
  if (!decoded) return { sold: 0n, total: 0n };
  const [sold, total] = decoded;
  return { sold, total };
}

export async function approveAsset(assetId: number, callerPublicKey: string) {
  const { registry } = getContractIds();
  if (!registry) throw new Error("registry contract not deployed");

  return callContract({
    contractId: registry,
    method: "approve_asset",
    args: [new Address(callerPublicKey).toScVal(), nativeToScVal(assetId, { type: "u32" })],
    callerPublicKey,
  });
}

export async function registerAsset(
  params: {
    assetOwner: string;
    assetName: string;
    assetCategory: string;
    assetCode: string;
    metadataUri: string;
    valuation: bigint;
    model: "WholeOwnership" | "Fractional";
  },
  callerPublicKey: string,
) {
  const { registry } = getContractIds();
  if (!registry) throw new Error("registry contract not deployed");

  return callContract({
    contractId: registry,
    method: "register_asset",
    args: [
      new Address(params.assetOwner).toScVal(),
      new Address(callerPublicKey).toScVal(),
      nativeToScVal(params.assetName, { type: "string" }),
      nativeToScVal(params.assetCategory, { type: "string" }),
      nativeToScVal(params.assetCode, { type: "string" }),
      nativeToScVal(params.metadataUri, { type: "string" }),
      nativeToScVal(params.valuation, { type: "i128" }),
      nativeToScVal(params.model === "Fractional" ? 1 : 0, { type: "u32" }),
    ],
    callerPublicKey,
  });
}

export async function archiveAsset(assetId: number, callerPublicKey: string) {
  const { registry } = getContractIds();
  if (!registry) throw new Error("registry contract not deployed");

  return callContract({
    contractId: registry,
    method: "archive_asset",
    args: [new Address(callerPublicKey).toScVal(), nativeToScVal(assetId, { type: "u32" })],
    callerPublicKey,
  });
}

export async function deleteAsset(assetId: number, callerPublicKey: string) {
  const { registry } = getContractIds();
  if (!registry) throw new Error("registry contract not deployed");

  return callContract({
    contractId: registry,
    method: "delete_asset",
    args: [new Address(callerPublicKey).toScVal(), nativeToScVal(assetId, { type: "u32" })],
    callerPublicKey,
  });
}

export async function burnAsset(assetId: number, callerPublicKey: string) {
  const { registry } = getContractIds();
  if (!registry) throw new Error("registry contract not deployed");

  return callContract({
    contractId: registry,
    method: "burn_asset",
    args: [nativeToScVal(assetId, { type: "u32" })],
    callerPublicKey,
  });
}
