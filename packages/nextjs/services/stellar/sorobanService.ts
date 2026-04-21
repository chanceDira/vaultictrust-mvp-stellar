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

  // Increase reliability with a higher fee (1000 stroops)
  const RELIABLE_FEE = "1000";
  const MAX_RETRIES = 1;
  let attempts = 0;

  while (attempts <= MAX_RETRIES) {
    try {
      const account = await server.getAccount(callerPublicKey);
      const tx = new TransactionBuilder(account, {
        fee: RELIABLE_FEE,
        networkPassphrase,
      })
        .addOperation(contract.call(method, ...args))
        .setTimeout(60) // 60s for signing
        .build();

      const simResult = await server.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(simResult)) {
        const errorMsg = parseSorobanError(simResult);
        throw new Error(errorMsg || `Simulation failed: ${simResult.error}`);
      }

      const preparedTx = rpc.assembleTransaction(tx, simResult).build();

      const { signTransaction } = await import("@stellar/freighter-api");
      const signedResult = await signTransaction(preparedTx.toXDR(), {
        networkPassphrase,
      });
      const signedXdr = typeof signedResult === "string" ? signedResult : (signedResult as any).signedTxXdr;

      const submittedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
      const response = await server.sendTransaction(submittedTx);

      if (response.status === "ERROR") {
        const errXdr = response.errorResult?.toXDR("base64") ?? "unknown error";
        // If txBAD_SEQ (encoded as ////9), retry once with fresh sequence
        if (errXdr.includes("////9") && attempts < MAX_RETRIES) {
          console.warn("[soroban] txBAD_SEQ detected, retrying...");
          attempts++;
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        throw new Error(`Transaction failed: ${errXdr}`);
      }

      let pollResult: Awaited<ReturnType<typeof server.getTransaction>> = null as any;
      let pollAttempts = 0;
      pollResult = await server.getTransaction(response.hash);
      while (pollResult.status === rpc.Api.GetTransactionStatus.NOT_FOUND && pollAttempts < 30) {
        await new Promise(r => setTimeout(r, 1000));
        pollResult = await server.getTransaction(response.hash);
        pollAttempts++;
      }

      if (pollResult.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        // Hardened result extraction to avoid "Bad union switch" errors in some SDK versions
        let result = null;
        try {
          // Attempt to access returnValue if available, otherwise fallback to null
          // Some SDK versions might throw during lazy decoding of returnValue
          result = (pollResult as any).returnValue || null;
        } catch (e) {
          console.warn("[soroban] Failed to decode returnValue, but transaction succeeded:", e);
        }
        return { result, hash: response.hash };
      }

      if (pollResult.status === rpc.Api.GetTransactionStatus.FAILED) {
        const errorMessage = parseSorobanError(pollResult);
        throw new Error(errorMessage || `Transaction failed on-chain. Hash: ${response.hash}`);
      }

      throw new Error(`Transaction did not finalize. Status: ${pollResult.status}`);
    } catch (e: any) {
      if (attempts >= MAX_RETRIES) throw e;
      console.warn(`[soroban] Attempt ${attempts + 1} failed, retrying...`, e.message);
      attempts++;
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  throw new Error("Transaction execution failed after retries.");
}

export async function setupUsdcTrustline(callerPublicKey: string) {
  const { getHorizonServer } = await import("./horizonClient");
  const horizon = getHorizonServer();
  const networkPassphrase = getNetworkPassphrase();

  const RELIABLE_FEE = "1000";
  const MAX_RETRIES = 1;
  let attempts = 0;

  while (attempts <= MAX_RETRIES) {
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
      const errXdr =
        e.response?.data?.extras?.result_codes?.transaction === "tx_bad_seq" || e.message?.includes("////9");
      if (errXdr && attempts < MAX_RETRIES) {
        console.warn("[horizon] txBAD_SEQ detected, retrying...");
        attempts++;
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      if (attempts >= MAX_RETRIES) throw e;
      attempts++;
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  throw new Error("Setup trustline failed after retries.");
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

  for (const event of events) {
    try {
      const body = event?.event?.body?.();
      const data = body?.v0?.()?.data?.() ?? event?.event?.v0?.()?.data?.();
      if (!data) continue;

      const nativeData = scValToNative(data);
      if (typeof nativeData === "string") {
        contractMessages.push(nativeData);
      } else if (Array.isArray(nativeData)) {
        for (const item of nativeData) {
          if (typeof item === "string" && item.length > 1) contractMessages.push(item);
        }
      }
    } catch {}
  }

  const joined = contractMessages.join(" | ");
  if (joined) {
    console.warn("[soroban] Contract diagnostic:", joined);
  }

  const ERROR_MAP: Record<string, string> = {
    "already initialized": "The protocol is already initialized.",
    "not an admin": "Unauthorized: Caller is not a protocol administrator.",
    "not found": "The requested record was not found on-chain.",
    "no investment pool": "No investment pool exists for this asset. It must be tokenized first.",
    "investor not KYC verified": "Your identity must be verified (KYC) before investing.",
    "investor cap exceeded": "Purchase exceeds the maximum shares allowed per investor.",
    "insufficient shares available": "Not enough shares remaining for this purchase.",
    "offering fully subscribed": "This offering is fully subscribed — no shares remain.",
    "zero purchase amount": "Share amount must be greater than zero.",
    "buyer not KYC verified": "Your identity must be verified (KYC) before purchasing.",
    "invalid valuation": "The provided asset valuation is invalid (must be positive).",
    "already registered": "This asset has already been submitted to the registry.",
    "user already verified": "This user is already KYC verified.",
    "no proceeds to withdraw": "There are no proceeds available to withdraw.",
    "no fees to sweep": "No protocol fees available to sweep.",
    "not asset owner": "Only the asset owner can perform this action.",
    "invalid share supply": "Share supply must be greater than zero.",
    "invalid price": "Price per share must be greater than zero.",
    "Error(Contract, #13)":
      "USDC Authorization Required: Your wallet must establish and authorize a trustline for the testnet USDC asset.",
    "Error(Contract, #10)": "Insufficient USDC Balance: You do not have enough funds to complete this investment.",
  };

  for (const [key, msg] of Object.entries(ERROR_MAP)) {
    if (joined.includes(key) || errorStr.includes(key)) return msg;
  }

  if (joined) return joined;

  if (errorStr.includes("InvalidAction")) return "Action not permitted by contract logic.";
  if (errorStr.includes("HostError")) {
    console.warn("[soroban] Raw HostError:", errorStr);
    return `Contract execution failed: ${errorStr.slice(0, 200)}`;
  }

  return errorStr || null;
}

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
