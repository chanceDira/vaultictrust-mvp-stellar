import { getNetworkPassphrase, getSorobanRpcUrl } from "./horizonClient";
import {
  Address,
  Asset,
  BASE_FEE,
  Contract,
  Keypair,
  Operation,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { TESTNET_USDC_ASSET, TESTNET_USDC_CONTRACT, deployedSorobanContracts } from "~~/scaffold.config";

let _rpcServer: rpc.Server | null = null;

// GLOBAL SEMAPHORE: Prevents "double-spending" bugs by ensuring only one
// transaction is ever processing at a time from this client session.
let isTransactionPending = false;

function getRpcServer(): rpc.Server {
  if (!_rpcServer) {
    _rpcServer = new rpc.Server(getSorobanRpcUrl(), { allowHttp: false });
  }
  return _rpcServer;
}

export function getContractIds() {
  const contracts = deployedSorobanContracts["testnet"];
  return {
    registry: contracts?.VaulticAssetRegistry ?? null,
    userRegistry: contracts?.VaulticUserRegistry ?? null,
    investmentManager: contracts?.VaulticInvestmentManager ?? null,
    dividendManager: contracts?.VaulticDividendManager ?? null,
  };
}

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
}): Promise<{ result: xdr.ScVal | null; hash: string }> {
  const server = getRpcServer();
  const networkPassphrase = getNetworkPassphrase();
  const contract = new Contract(contractId);

  // Check the global semaphore before starting
  if (isTransactionPending) {
    console.error("[soroban] Transaction aborted: Another signing request is already in-flight.");
    throw new Error("A transaction is already in-flight. Please finish the current request in your wallet.");
  }

  // Increase reliability with a higher fee (1000 stroops)
  const RELIABLE_FEE = "1000";

  // CRITICAL: We removed the retry loop to prevent double-execution bugs.
  // Transaction lifecycle is now one-shot: simulate -> sign -> submit -> poll.
  isTransactionPending = true;
  try {
    // 1. Fetch fresh account for sequence number
    const account = await server.getAccount(callerPublicKey);

    // 2. Build template transaction
    const tx = new TransactionBuilder(account, {
      fee: RELIABLE_FEE,
      networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(60) // 60s for signing window
      .build();

    // 3. Simulate to get footprints and resource requirements
    const simResult = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simResult)) {
      const errorMsg = parseSorobanError(simResult);
      throw new Error(errorMsg || `Simulation failed: ${simResult.error}`);
    }

    // 4. Assemble and prepare for signing
    const preparedTx = rpc.assembleTransaction(tx, simResult).build();

    // 5. User signs via Freighter
    const { signTransaction } = await import("@stellar/freighter-api");
    const signedResult = await signTransaction(preparedTx.toXDR(), {
      networkPassphrase,
    });
    const signedXdr = typeof signedResult === "string" ? signedResult : (signedResult as any).signedTxXdr;

    // 6. Final submission to the network
    const submittedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
    const response = await server.sendTransaction(submittedTx);

    if (response.status === "ERROR") {
      const errXdr = response.errorResult?.toXDR("base64") ?? "unknown error";
      throw new Error(`Submission failed: ${errXdr}`);
    }

    // 7. Poll until finalized or timed out
    let pollResult: Awaited<ReturnType<typeof server.getTransaction>> = null as any;
    let pollAttempts = 0;
    pollResult = await server.getTransaction(response.hash);

    while (pollResult.status === rpc.Api.GetTransactionStatus.NOT_FOUND && pollAttempts < 30) {
      await new Promise(r => setTimeout(r, 1000));
      pollResult = await server.getTransaction(response.hash);
      pollAttempts++;
    }

    if (pollResult.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      // High-reliability result extraction
      let result = null;
      try {
        const rawResult = (pollResult as any).returnValue;
        if (rawResult) {
          result = rawResult;
        }
      } catch (e) {
        console.warn("[soroban] Executed successfully, but failed to decode return value:", e);
      }
      return { result, hash: response.hash };
    }

    if (pollResult.status === rpc.Api.GetTransactionStatus.FAILED) {
      const errorMessage = parseSorobanError(pollResult);
      throw new Error(errorMessage || `Transaction failed on-chain. Hash: ${response.hash}`);
    }

    throw new Error(
      `Transaction did not finalize (Status: ${pollResult.status}). Check explorer for hash: ${response.hash}`,
    );
  } catch (e: any) {
    console.error("[soroban] callContract execution failed:", e.message);
    throw e;
  } finally {
    isTransactionPending = false;
  }
}

export async function setupUsdcTrustline(callerPublicKey: string) {
  if (isTransactionPending) {
    throw new Error("A transaction is already in-flight. Please finish the current request in your wallet.");
  }

  const { getHorizonServer } = await import("./horizonClient");
  const horizon = getHorizonServer();
  const networkPassphrase = getNetworkPassphrase();

  const RELIABLE_FEE = "1000";
  isTransactionPending = true;

  try {
    const account = await horizon.loadAccount(callerPublicKey);
    const usdcAsset = new Asset(TESTNET_USDC_ASSET.code, TESTNET_USDC_ASSET.issuer);

    const tx = new TransactionBuilder(account, {
      fee: RELIABLE_FEE,
      networkPassphrase,
    })
      .addOperation(
        Operation.changeTrust({
          asset: usdcAsset,
        }),
      )
      .setTimeout(60)
      .build();

    const { signTransaction } = await import("@stellar/freighter-api");
    const signedResult = await signTransaction(tx.toXDR(), {
      networkPassphrase,
    });

    const signedXdr = typeof signedResult === "string" ? signedResult : (signedResult as any).signedTxXdr;
    const response = await horizon.submitTransaction(TransactionBuilder.fromXDR(signedXdr, networkPassphrase));
    return response;
  } catch (e: any) {
    console.error("[horizon] setupUsdcTrustline failed:", e.message);
    throw e;
  } finally {
    isTransactionPending = false;
  }
}

export async function fetchUsdcTrustlineStatus(publicKey: string): Promise<{
  hasTrustline: boolean;
  isAuthorized: boolean;
  balance: string;
}> {
  try {
    const { getHorizonServer } = await import("./horizonClient");
    const horizon = getHorizonServer();
    const account = await horizon.loadAccount(publicKey);

    const usdc = account.balances.find(
      (b: any) => b.asset_code === TESTNET_USDC_ASSET.code && b.asset_issuer === TESTNET_USDC_ASSET.issuer,
    );

    if (!usdc) {
      return { hasTrustline: false, isAuthorized: false, balance: "0" };
    }

    return {
      hasTrustline: true,
      isAuthorized: (usdc as any).is_authorized !== false,
      balance: (usdc as any).balance || "0",
    };
  } catch (e) {
    console.error("[soroban] Error fetching trustline status:", e);
    return { hasTrustline: false, isAuthorized: false, balance: "0" };
  }
}

function parseSorobanError(result: any): string | null {
  if (!result) return null;

  const errorStr = result.error?.toString() || "";
  const events = result.diagnosticEvents || result.result?.diagnosticEvents || [];
  const contractMessages: string[] = [];

  // Extremely defensive diagnostic event parsing to stop "Bad union switch" crashes
  for (const event of events) {
    try {
      if (!event || !event.event) continue;

      // Accessing body() and v0() can trigger lazy XDR decoding crashes
      let dataVal: any = null;
      try {
        const body = (event.event as any).body?.();
        dataVal = body?.v0?.()?.data?.() ?? (event.event as any).v0?.()?.data?.();
      } catch {
        // Silently catch and ignore individual bad events (likely corrupted/unexpected XDR union)
        continue;
      }

      if (!dataVal) continue;

      const nativeData = scValToNative(dataVal);
      if (typeof nativeData === "string") {
        contractMessages.push(nativeData);
      } else if (Array.isArray(nativeData)) {
        for (const item of nativeData) {
          if (typeof item === "string" && item.length > 1) {
            contractMessages.push(item);
          }
        }
      }
    } catch {
      // General catch for this specific event to prevent crash propagation
    }
  }

  const dynamicMessage = contractMessages.join(" | ");

  // Prioritize real contract panic messages (dynamic reverts)
  if (dynamicMessage) {
    console.warn("[soroban] Contract panic message detected:", dynamicMessage);
    // If the dynamic message is a recognized short-code, map it to a cleaner description
    const lowerDynamic = dynamicMessage.toLowerCase();
    for (const [key, value] of Object.entries(ERROR_MAP)) {
      if (lowerDynamic.includes(key.toLowerCase())) return value;
    }
    return dynamicMessage;
  }

  // Fallback to static mapping for common Soroban host errors or non-event errors
  const lowerError = errorStr.toLowerCase();
  for (const [key, value] of Object.entries(ERROR_MAP)) {
    if (lowerError.includes(key.toLowerCase())) return value;
  }

  if (errorStr.includes("InvalidAction")) return "Unauthorized or invalid contract state.";
  if (errorStr.includes("HostStorageError")) return "Storage error: Contract data exceeded its TTL.";

  return errorStr || null;
}

const ERROR_MAP: Record<string, string> = {
  "already initialized": "The protocol is already initialized.",
  "not an admin": "Unauthorized: This action requires a Vaultic Administrator wallet.",
  "not authorized": "Unauthorized: You do not have permission for this action.",
  "not found": "The requested record was not found on the Stellar ledger.",
  "no investment pool": "This asset must be tokenized before you can invest.",
  "investor not kyc verified": "KYC Verification required: Please complete your profile first.",
  "investor cap exceeded": "You have reached the maximum share limit for this asset.",
  "insufficient shares available": "Not enough shares remaining for this purchase.",
  "offering fully subscribed": "This offering is closed: 100% of shares have been sold.",
  "zero purchase amount": "Please enter a valid investment amount.",
  "invalid valuation": "Registration failed: Asset valuation must be a positive number.",
  "invalid transition": "This action is not allowed for the asset's current state.",
  "already registered": "This asset has already been submitted for registration.",
  "not asset owner": "Only the registered asset owner can perform this action.",
  "model mismatch": "This asset was registered as Whole Ownership and cannot be fractionalized.",
  "invalid input": "One or more inputs provided to the contract are invalid.",
  tx_bad_seq: "Wallet Sequence Error: Please refresh and try again.",
  tx_insufficient_balance: "Insufficient XLM: You need more Stellar native tokens for network fees.",
  tx_no_trust: "Missing Trustline: You must establish a trustline for this asset before buying.",
  "Error(Contract, #13)": "Trustline Required: Your wallet must establish and authorize a trustline for the asset.",
  "Error(Contract, #10)": "Insufficient Balance: You do not have enough funds to complete this transaction.",
  "Error(Contract, #1)": "Internal Protocol Error: please verify the asset state and try again.",
};

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

export async function fetchYieldRound(assetId: number, roundIndex: number) {
  const { dividendManager } = getContractIds();
  if (!dividendManager) return null;

  try {
    const result = await simulateReadCall({
      contractId: dividendManager,
      method: "get_yield_round",
      args: [nativeToScVal(assetId, { type: "u32" }), nativeToScVal(roundIndex, { type: "u32" })],
    });
    return result ? scValToNative(result) : null;
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

export async function fetchAdmins() {
  const { userRegistry } = getContractIds();
  if (!userRegistry) return [];

  const result = await simulateReadCall({
    contractId: userRegistry,
    method: "get_admins",
    args: [],
  });
  return result ? scValToNative(result) : [];
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
