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
    throw new Error(`Simulation failed: ${simResult.error}`);
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
    throw new Error(`Transaction failed: ${response.errorResult?.toXDR()}`);
  }

  // Poll for completion
  let pollResult = await server.getTransaction(response.hash);
  let attempts = 0;
  while (pollResult.status === rpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 30) {
    await new Promise(r => setTimeout(r, 1000));
    pollResult = await server.getTransaction(response.hash);
    attempts++;
  }

  if (pollResult.status === rpc.Api.GetTransactionStatus.SUCCESS) {
    return pollResult.returnValue ?? null;
  }

  throw new Error(`Transaction did not finalize. Status: ${pollResult.status}`);
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

  return (simResult as rpc.Api.SimulateTransactionSuccessResponse).result?.retval ?? null;
}

// ---------------------------------------------------------------------------
// AssetRegistry — Read functions
// ---------------------------------------------------------------------------

function normalizeAssetRecord(rawAsset: any) {
  if (!rawAsset) return null;

  const states = ["Pending", "Active", "Tokenized", "Closed", "Relisted"];
  const models = ["WholeOwnership", "Fractional"];

  let stateTag = rawAsset.state;
  if (typeof stateTag === "number") {
    stateTag = states[stateTag] || "Pending";
  }

  let modelTag = rawAsset.model;
  if (typeof modelTag === "number") {
    modelTag = models[modelTag] || "WholeOwnership";
  }

  return {
    ...rawAsset,
    state: typeof rawAsset.state === "object" ? rawAsset.state : { ...rawAsset.state, tag: stateTag },
    model: typeof rawAsset.model === "object" ? rawAsset.model : { ...rawAsset.model, tag: modelTag },
  };
}

function normalizeKycRecord(rawRecord: any) {
  if (!rawRecord) return null;

  const statuses = ["None", "Pending", "Verified", "Rejected", "Suspended"];

  let statusTag = rawRecord.status;
  if (typeof statusTag === "number") {
    statusTag = statuses[statusTag] || "None";
  }

  return {
    ...rawRecord,
    status: typeof rawRecord.status === "object" ? rawRecord.status : { ...rawRecord.status, tag: statusTag },
  };
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
    args: [nativeToScVal(assetId, { type: "u32" })],
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
    args: [],
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

  // Map integer status back to Symbol name for Soroban
  const KYC_STATUS_SYMBOLS = ["None", "Pending", "Verified", "Rejected", "Suspended"];
  const statusSymbol = KYC_STATUS_SYMBOLS[status] || "None";

  return callContract({
    contractId: userRegistry,
    method: "set_status",
    args: [new Address(userAddress).toScVal(), nativeToScVal(statusSymbol, { type: "symbol" })],
    callerPublicKey,
  });
}
