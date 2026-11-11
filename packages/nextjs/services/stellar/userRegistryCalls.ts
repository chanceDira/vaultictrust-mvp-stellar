import { Address, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import { callContract } from "./sorobanCall";
import { normalizeKycRecord, safeScValToNative } from "./sorobanDecode";
import { simulateReadCall } from "./sorobanRead";
import { getContractIds, getRpcServer } from "./sorobanRpc";

export async function fetchUserRecord(userAddress: string): Promise<import("~~/types/stellar").UserRecord | null> {
  const { userRegistry } = getContractIds();
  if (!userRegistry) return null;

  const result = await simulateReadCall({
    contractId: userRegistry,
    method: "get_user",
    args: [new Address(userAddress).toScVal()],
  });
  return result ? normalizeKycRecord(safeScValToNative(result)) : null;
}

export async function fetchAdmins() {
  const { userRegistry } = getContractIds();
  if (!userRegistry) return [];

  const result = await simulateReadCall({
    contractId: userRegistry,
    method: "get_admins",
    args: [],
  });
  return result ? ((safeScValToNative(result) as string[]) ?? []) : [];
}

export async function setAdmins(newAdmins: string[], callerPublicKey: string) {
  const { userRegistry } = getContractIds();
  if (!userRegistry) throw new Error("userRegistry contract not deployed");

  const adminAddresses = newAdmins.map(addr => new Address(addr).toScVal());

  return callContract({
    contractId: userRegistry,
    method: "set_admins",
    args: [new Address(callerPublicKey).toScVal(), xdr.ScVal.scvVec(adminAddresses)],
    callerPublicKey,
  });
}

export async function isVerified(userAddress: string): Promise<boolean> {
  const { userRegistry } = getContractIds();
  if (!userRegistry) return false;

  const result = await simulateReadCall({
    contractId: userRegistry,
    method: "is_verified",
    args: [new Address(userAddress).toScVal()],
  });
  return result ? ((safeScValToNative(result) as boolean) ?? false) : false;
}

export async function fetchTotalUsers(): Promise<number> {
  const { userRegistry } = getContractIds();
  if (!userRegistry) return 0;

  const result = await simulateReadCall({
    contractId: userRegistry,
    method: "get_total_users",
    args: [],
  });
  return result ? Number(safeScValToNative(result) ?? 0) : 0;
}

export async function fetchAllUserAddresses(offset = 0, limit = 100): Promise<string[]> {
  const { userRegistry } = getContractIds();
  if (!userRegistry) return [];

  const result = await simulateReadCall({
    contractId: userRegistry,
    method: "get_all_users",
    args: [nativeToScVal(offset, { type: "u32" }), nativeToScVal(limit, { type: "u32" })],
  });
  return result ? ((safeScValToNative(result) as string[]) ?? []) : [];
}

export async function submitKyc(metadataUri: string, commitment: Uint8Array, callerPublicKey: string) {
  const { userRegistry } = getContractIds();
  if (!userRegistry) throw new Error("userRegistry contract not deployed");

  return callContract({
    contractId: userRegistry,
    method: "submit_kyc",
    args: [
      new Address(callerPublicKey).toScVal(),
      nativeToScVal(metadataUri, { type: "string" }),
      xdr.ScVal.scvBytes(Buffer.from(commitment)),
    ],
    callerPublicKey,
  });
}

export async function setUserStatus(userAddress: string, status: number, callerPublicKey: string) {
  const { userRegistry } = getContractIds();
  if (!userRegistry) throw new Error("userRegistry contract not deployed");

  return callContract({
    contractId: userRegistry,
    method: "set_status",
    args: [
      new Address(callerPublicKey).toScVal(),
      new Address(userAddress).toScVal(),
      nativeToScVal(status, { type: "u32" }),
    ],
    callerPublicKey,
  });
}

export async function batchSetUserStatus(userAddresses: string[], status: number, callerPublicKey: string) {
  const { userRegistry } = getContractIds();
  if (!userRegistry) throw new Error("userRegistry contract not deployed");

  const addressScVals = userAddresses.map(addr => new Address(addr).toScVal());

  return callContract({
    contractId: userRegistry,
    method: "batch_set_status",
    args: [
      new Address(callerPublicKey).toScVal(),
      xdr.ScVal.scvVec(addressScVals),
      nativeToScVal(status, { type: "u32" }),
    ],
    callerPublicKey,
  });
}

export async function fetchKycSubmissions(): Promise<string[]> {
  const server = getRpcServer();
  const { userRegistry } = getContractIds();
  if (!userRegistry) return [];

  try {
    const latestLedger = await server.getLatestLedger();
    const startLedger = Math.max(1, latestLedger.sequence - 15000);

    const eventResponse = await server.getEvents({
      startLedger,
      filters: [
        {
          type: "contract",
          contractIds: [userRegistry],
          topics: [[nativeToScVal("kyc_sub", { type: "symbol" }).toXDR("base64"), "*"]],
        },
      ],
    });

    const userSet = new Set<string>();
    for (const event of eventResponse.events) {
      if (event.topic.length >= 2) {
        try {
          const userAddr = safeScValToNative(event.topic[1]);
          if (typeof userAddr === "string") {
            userSet.add(userAddr);
          }
        } catch {}
      }
    }

    return Array.from(userSet);
  } catch (err) {
    return [];
  }
}
