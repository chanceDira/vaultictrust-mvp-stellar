/**
 * Vaultic Trust — Soroban Contract Client Service
 *
 * Handles all interactions with the deployed Soroban contracts via
 * the Stellar JS SDK's SorobanRpc server and Freighter wallet signing.
 *
 * Architecture:
 *   - Read calls: use SorobanRpc.Server.simulateTransaction (free, no signing)
 *   - Write calls: build tx → sign with Freighter → submit to SorobanRpc
 */
import { getNetworkPassphrase, getSorobanRpcUrl } from "./horizonClient";
import {
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { deployedSorobanContracts } from "~~/scaffold.config";

// ---------------------------------------------------------------------------
// RPC Client (singleton)
// ---------------------------------------------------------------------------

let _rpcServer: rpc.Server | null = null;

function getRpcServer(): rpc.Server {
  if (!_rpcServer) {
    _rpcServer = new rpc.Server(getSorobanRpcUrl(), { allowHttp: false });
  }
  return _rpcServer;
}

// ---------------------------------------------------------------------------
// Contract addresses
// ---------------------------------------------------------------------------

export function getContractIds() {
  const contracts = deployedSorobanContracts["testnet"];
  return {
    registry: contracts?.VaulticAssetRegistry ?? null,
    userRegistry: contracts?.VaulticUserRegistry ?? null,
    investmentManager: contracts?.VaulticInvestmentManager ?? null,
    dividendManager: contracts?.VaulticDividendManager ?? null,
  };
}

// ---------------------------------------------------------------------------
// Helper: build, sign (Freighter), and submit a Soroban transaction
// ---------------------------------------------------------------------------

export async function callContract({
  contractId,
  method,
  args,
  callerPublicKey,
}: {
  contractId: string;
  method: string;
  args: xdr.ScVal[];
  callerPublicKey: string;
}): Promise<xdr.ScVal | null> {
  const server = getRpcServer();
  const networkPassphrase = getNetworkPassphrase();

  const account = await server.getAccount(callerPublicKey);
  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  // Simulate to get footprint + resource fee
  const simResult = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResult)) {
    const errorMsg = parseSorobanError(simResult);
    throw new Error(errorMsg || `Simulation failed: ${simResult.error}`);
  }

  const preparedTx = rpc.assembleTransaction(tx, simResult).build();

  // Sign with Freighter
  const { signTransaction } = await import("@stellar/freighter-api");
  const signedResult = await signTransaction(preparedTx.toXDR(), {
    networkPassphrase,
  });
  const signedXdr = typeof signedResult === "string" ? signedResult : (signedResult as any).signedTxXdr;

  // Submit
  const submittedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
  const response = await server.sendTransaction(submittedTx);

  if (response.status === "ERROR") {
    // Use base64 encoding to avoid secondary XDR parse errors in the error message
    const errXdr = response.errorResult?.toXDR("base64") ?? "unknown error";
    throw new Error(`Transaction failed: ${errXdr}`);
  }

  // Poll for completion — wrap in try/catch because the SDK may throw
  // 'Bad union switch' when deserializing ledger-change events that contain
  // contract-type enums stored as #[repr(u32)] integers.
  let pollResult: Awaited<ReturnType<typeof server.getTransaction>>;
  let attempts = 0;
  try {
    pollResult = await server.getTransaction(response.hash);
    while (pollResult.status === rpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 30) {
      await new Promise(r => setTimeout(r, 1000));
      pollResult = await server.getTransaction(response.hash);
      attempts++;
    }
  } catch (xdrErr: any) {
    // The SDK can throw 'Bad union switch' when parsing response metadata.
    // If this happens, the tx was already submitted — treat as success and
    // let the UI refresh to pick up the new state.
    console.warn("[soroban] getTransaction XDR parse error (tx likely succeeded):", xdrErr?.message);
    return null;
  }

  if (pollResult.status === rpc.Api.GetTransactionStatus.SUCCESS) {
    try {
      return pollResult.returnValue ?? null;
    } catch {
      return null;
    }
  }

  if (pollResult.status === rpc.Api.GetTransactionStatus.FAILED) {
    // Attempt to find Diagnostic Events for human readable errors
    const errorMessage = parseSorobanError(pollResult);
    throw new Error(errorMessage || `Transaction failed on-chain. Hash: ${response.hash}`);
  }

  throw new Error(`Transaction did not finalize. Status: ${pollResult.status}`);
}

/**
 * Parses Soroban simulation & transaction errors into human-readable strings.
 */
function parseSorobanError(result: any): string | null {
  if (!result) return null;

  // Extract from simulation error string
  const errorStr = result.error?.toString() || "";

  // Extract from diagnostic events (more descriptive)
  const events = result.diagnosticEvents || result.result?.diagnosticEvents || [];
  let detailedError = "";

  for (const event of events) {
    if (event.event?.type()?.name === "diagnostic") {
      const data = event.event.v0().data();
      try {
        const nativeData = scValToNative(data);
        if (Array.isArray(nativeData)) {
          // Look for common panic patterns
          if (nativeData.includes("UnreachableCodeReached"))
            detailedError = "Contract logic error (Trap). Check requirements.";
          if (nativeData.includes("already initialized")) detailedError = "The protocol is already initialized.";
          if (nativeData.includes("not an admin"))
            detailedError = "Unauthorized: Caller is not a protocol administrator.";
          if (nativeData.includes("not found")) detailedError = "The requested record was not found on-chain.";
          if (nativeData.includes("invalid valuation"))
            detailedError = "The provided asset valuation is invalid (must be positive).";
          if (nativeData.includes("already registered"))
            detailedError = "This asset has already been submitted to the registry.";
          if (nativeData.includes("user already verified")) detailedError = "This user is already KYC verified.";
        }
      } catch {}
    }
  }

  if (detailedError) return detailedError;

  // Fallback pattern matching on raw error string
  if (errorStr.includes("InvalidAction")) return "Action not permitted by contract logic.";
  if (errorStr.includes("HostError")) return "Network execution error. Check your inputs or permissions.";

  return errorStr || null;
}

// ---------------------------------------------------------------------------
// Helper: read-only simulation (no signing needed)
// ---------------------------------------------------------------------------

async function simulateReadCall({
  contractId,
  method,
  args,
}: {
  contractId: string;
  method: string;
  args: xdr.ScVal[];
}): Promise<xdr.ScVal | null> {
  const server = getRpcServer();
  const networkPassphrase = getNetworkPassphrase();

  // Use a dummy keypair for simulation reads (no real signing)
  const dummyKeypair = Keypair.random();
  const dummyAccount = await server.getAccount(dummyKeypair.publicKey()).catch(() => ({
    accountId: () => dummyKeypair.publicKey(),
    sequenceNumber: () => "0",
    incrementSequenceNumber: () => {},
    sequence: "0",
  }));

  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(dummyAccount as any, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Read simulation failed: ${simResult.error}`);
  }

  try {
    return (simResult as rpc.Api.SimulateTransactionSuccessResponse).result?.retval ?? null;
  } catch (xdrErr: any) {
    console.warn("[soroban] simulateReadCall retval XDR parse error:", xdrErr?.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// AssetRegistry — Read functions
// ---------------------------------------------------------------------------

function normalizeAssetRecord(rawAsset: any) {
  if (!rawAsset) return null;
  try {
    const states = ["Pending", "Active", "Tokenized", "Closed", "Relisted"];
    const models = ["WholeOwnership", "Fractional"];

    let stateTag = rawAsset.state;
    if (typeof stateTag === "number") {
      stateTag = states[stateTag] ?? "Pending";
    } else if (typeof stateTag === "object" && stateTag !== null) {
      stateTag = stateTag.tag ?? states[0];
    }

    let modelTag = rawAsset.model;
    if (typeof modelTag === "number") {
      modelTag = models[modelTag] ?? "WholeOwnership";
    } else if (typeof modelTag === "object" && modelTag !== null) {
      modelTag = modelTag.tag ?? models[0];
    }

    return {
      ...rawAsset,
      state: { tag: stateTag },
      model: { tag: modelTag },
    };
  } catch {
    return rawAsset;
  }
}

function normalizeKycRecord(rawRecord: any) {
  if (!rawRecord) return null;
  try {
    const statuses = ["None", "Pending", "Verified", "Rejected", "Suspended"];

    let statusTag = rawRecord.status;
    if (typeof statusTag === "number") {
      statusTag = statuses[statusTag] ?? "None";
    } else if (typeof statusTag === "object" && statusTag !== null) {
      statusTag = statusTag.tag ?? statuses[0];
    }

    return {
      ...rawRecord,
      status: { tag: statusTag },
    };
  } catch {
    return rawRecord;
  }
}

export async function fetchTotalAssets(): Promise<number> {
  const { registry } = getContractIds();
  if (!registry) return 0;

  const result = await simulateReadCall({
    contractId: registry,
    method: "total_assets",
    args: [],
  });
  return result ? Number(scValToNative(result)) : 0;
}

export async function fetchAsset(assetId: number): Promise<any> {
  const { registry } = getContractIds();
  if (!registry) return null;

  const result = await simulateReadCall({
    contractId: registry,
    method: "get_asset",
    args: [nativeToScVal(assetId, { type: "u32" })],
  });
  return result ? normalizeAssetRecord(scValToNative(result)) : null;
}

export async function fetchAssetsByOwner(ownerAddress: string): Promise<number[]> {
  const { registry } = getContractIds();
  if (!registry) return [];

  const result = await simulateReadCall({
    contractId: registry,
    method: "get_assets_by_owner",
    args: [new Address(ownerAddress).toScVal()],
  });
  return result ? (scValToNative(result) as number[]) : [];
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
  const [sold, total] = scValToNative(result) as [bigint, bigint];
  return { sold, total };
}

// ---------------------------------------------------------------------------
// AssetRegistry — Write functions
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// InvestmentManager — Read functions
// ---------------------------------------------------------------------------

export async function fetchPool(assetId: number): Promise<any> {
  const { investmentManager } = getContractIds();
  if (!investmentManager) return null;

  const result = await simulateReadCall({
    contractId: investmentManager,
    method: "get_pool",
    args: [nativeToScVal(assetId, { type: "u32" })],
  });
  return result ? scValToNative(result) : null;
}

export async function fetchAvailableShares(assetId: number): Promise<bigint> {
  const { investmentManager } = getContractIds();
  if (!investmentManager) return 0n;

  const result = await simulateReadCall({
    contractId: investmentManager,
    method: "available_shares",
    args: [nativeToScVal(assetId, { type: "u32" })],
  });
  return result ? (scValToNative(result) as bigint) : 0n;
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
  const [gross, fee, net] = scValToNative(result) as [bigint, bigint, bigint];
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
  return result ? (scValToNative(result) as bigint) : 0n;
}

export async function fetchInvestorHoldings(assetId: number, investor: string): Promise<bigint> {
  const { investmentManager } = getContractIds();
  if (!investmentManager) return 0n;

  const result = await simulateReadCall({
    contractId: investmentManager,
    method: "get_investor_holdings",
    args: [nativeToScVal(assetId, { type: "u32" }), new Address(investor).toScVal()],
  });
  return result ? (scValToNative(result) as bigint) : 0n;
}

// ---------------------------------------------------------------------------
// InvestmentManager — Write functions
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// DividendManager — Read functions
// ---------------------------------------------------------------------------

export async function fetchClaimableYield(assetId: number, investor: string): Promise<bigint> {
  const { dividendManager } = getContractIds();
  if (!dividendManager) return 0n;

  const result = await simulateReadCall({
    contractId: dividendManager,
    method: "get_claimable_yield",
    args: [nativeToScVal(assetId, { type: "u32" }), new Address(investor).toScVal()],
  });
  return result ? (scValToNative(result) as bigint) : 0n;
}

export async function fetchYieldRoundCount(assetId: number): Promise<number> {
  const { dividendManager } = getContractIds();
  if (!dividendManager) return 0;

  const result = await simulateReadCall({
    contractId: dividendManager,
    method: "get_yield_round_count",
    args: [nativeToScVal(assetId, { type: "u32" })],
  });
  return result ? Number(scValToNative(result)) : 0;
}

// ---------------------------------------------------------------------------
// DividendManager — Write functions
// ---------------------------------------------------------------------------

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

export async function fetchTotalFees(): Promise<bigint> {
  const { investmentManager } = getContractIds();
  if (!investmentManager) return 0n;

  const result = await simulateReadCall({
    contractId: investmentManager,
    method: "accumulated_fees",
    args: [],
  });
  return result ? (scValToNative(result) as bigint) : 0n;
}
// ---------------------------------------------------------------------------
// UserRegistry — Read functions
// ---------------------------------------------------------------------------

export async function fetchUserRecord(userAddress: string): Promise<any> {
  const { userRegistry } = getContractIds();
  if (!userRegistry) return null;

  const result = await simulateReadCall({
    contractId: userRegistry,
    method: "get_user",
    args: [new Address(userAddress).toScVal()],
  });
  return result ? normalizeKycRecord(scValToNative(result)) : null;
}

export async function isVerified(userAddress: string): Promise<boolean> {
  const { userRegistry } = getContractIds();
  if (!userRegistry) return false;

  const result = await simulateReadCall({
    contractId: userRegistry,
    method: "is_verified",
    args: [new Address(userAddress).toScVal()],
  });
  return result ? (scValToNative(result) as boolean) : false;
}

export async function fetchTotalUsers(): Promise<number> {
  const { userRegistry } = getContractIds();
  if (!userRegistry) return 0;

  const result = await simulateReadCall({
    contractId: userRegistry,
    method: "get_total_users",
    args: [],
  });
  return result ? Number(scValToNative(result)) : 0;
}

export async function fetchAllUserAddresses(offset = 0, limit = 100): Promise<string[]> {
  const { userRegistry } = getContractIds();
  if (!userRegistry) return [];

  const result = await simulateReadCall({
    contractId: userRegistry,
    method: "get_all_users",
    args: [nativeToScVal(offset, { type: "u32" }), nativeToScVal(limit, { type: "u32" })],
  });
  return result ? (scValToNative(result) as string[]) : [];
}

// ---------------------------------------------------------------------------
// UserRegistry — Write functions
// ---------------------------------------------------------------------------

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

/**
 * Fetches recent KYC submissions from the UserRegistry by querying on-chain events.
 * Uses a lookback period of ~24 hours.
 */
export async function fetchKycSubmissions(): Promise<string[]> {
  const server = getRpcServer();
  const { userRegistry } = getContractIds();
  if (!userRegistry) return [];

  try {
    // Get latest ledger for lookback window (~24 hours / 15,000 ledgers)
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

    // Extract user addresses from topic[1]
    const userSet = new Set<string>();
    for (const event of eventResponse.events) {
      if (event.topic.length >= 2) {
        try {
          const userAddr = scValToNative(event.topic[1]);
          if (typeof userAddr === "string") {
            userSet.add(userAddr);
          }
        } catch {}
      }
    }

    return Array.from(userSet);
  } catch (err) {
    console.error("[soroban] fetchKycSubmissions error:", err);
    return [];
  }
}
