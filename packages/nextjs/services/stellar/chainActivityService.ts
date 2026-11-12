import { rpc } from "@stellar/stellar-sdk";
import vaulticConfig from "~~/scaffold.config";
import { fetchAsset } from "~~/services/stellar/assetRegistryCalls";
import { fetchInvestorHoldings, fetchPool } from "~~/services/stellar/investmentCalls";
import { getSupabaseAdmin, listingCopyConfigured, saveListing } from "~~/services/stellar/listingCopyService";
import { safeScValToNative } from "~~/services/stellar/sorobanDecode";
import { getContractIds, getRpcServer } from "~~/services/stellar/sorobanRpc";
import { fetchUserRecord } from "~~/services/stellar/userRegistryCalls";
import {
  type ActivityRecord,
  type PoolRecord,
  decodeChainEvent,
  poolRecordFromNative,
  userCopyFromRecord,
} from "~~/utils/vaultic/chainActivity";
import { parseProtocolFeeBps, readInstanceAddress, readInstanceI128 } from "~~/utils/vaultic/protocolFee";

const EVENT_PAGE_LIMIT = 100;
const LEDGER_WINDOW = 2_000;
const PAGES_PER_SYNC = 5;
const STATE_REFRESH_LIMIT = 20;
const POOL_KINDS = new Set(["buy_sh", "tokenized", "tok_ast", "relist", "withdrw", "sold_upd", "rl_frac"]);
const HOLDING_KINDS = new Set(["buy_sh", "sell_sh"]);
const USER_KINDS = new Set(["kyc_sub", "kyc_upd"]);

export type ChainSyncResult = {
  skipped: boolean;
  ingested: number;
  caughtUp: boolean;
  failed: boolean;
};

type StoredCursor = {
  cursor: string | null;
  scanLedger: number | null;
};

function contractIds(): string[] {
  return Object.values(getContractIds()).filter((id): id is string => typeof id === "string" && id.length > 0);
}

function contractIdText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "contractId" in value) {
    const read = (value as { contractId: unknown }).contractId;
    if (typeof read === "function") {
      const id = (read as () => unknown)();
      return typeof id === "string" ? id : "";
    }
  }
  return "";
}

function activityFromEvent(event: rpc.Api.EventResponse): ActivityRecord | null {
  if (!event.inSuccessfulContractCall) return null;
  return decodeChainEvent({
    eventId: event.id,
    txHash: event.txHash,
    contractId: contractIdText(event.contractId),
    ledger: event.ledger,
    ledgerClosedAt: event.ledgerClosedAt,
    topics: event.topic.map(topic => safeScValToNative(topic)),
    value: safeScValToNative(event.value),
  });
}

function uniqueNumbers(values: Array<number | null>): number[] {
  return [...new Set(values.filter((value): value is number => value !== null))].slice(0, STATE_REFRESH_LIMIT);
}

async function readCursor(network: string): Promise<StoredCursor> {
  const client = getSupabaseAdmin();
  if (!client) return { cursor: null, scanLedger: null };
  const result = await client.from("chain_cursors").select("cursor, scan_ledger").eq("network", network).maybeSingle();
  if (result.error || !result.data) return { cursor: null, scanLedger: null };
  const cursor = typeof result.data.cursor === "string" && result.data.cursor.length > 0 ? result.data.cursor : null;
  const scanLedger = typeof result.data.scan_ledger === "number" ? result.data.scan_ledger : null;
  return { cursor, scanLedger };
}

async function writeCursor(network: string, stored: StoredCursor): Promise<boolean> {
  const client = getSupabaseAdmin();
  if (!client) return false;
  const result = await client.from("chain_cursors").upsert(
    {
      network,
      cursor: stored.cursor,
      scan_ledger: stored.scanLedger,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "network" },
  );
  return !result.error;
}

async function writeActivities(network: string, records: ActivityRecord[]): Promise<boolean> {
  if (records.length === 0) return true;
  const client = getSupabaseAdmin();
  if (!client) return false;
  const result = await client.from("activities").upsert(
    records.map(record => ({
      network,
      event_id: record.eventId,
      ledger: record.ledger,
      ledger_closed_at: record.ledgerClosedAt,
      tx_hash: record.txHash,
      contract_id: record.contractId,
      kind: record.kind,
      asset_id: record.assetId,
      account: record.account,
      counterparty: record.counterparty,
      amount: record.amount,
      amount_secondary: record.amountSecondary,
      amount_tertiary: record.amountTertiary,
      payload: record.payload,
      ingested_at: new Date().toISOString(),
    })),
    { onConflict: "network,event_id" },
  );
  return !result.error;
}

async function writePool(network: string, pool: PoolRecord): Promise<void> {
  const client = getSupabaseAdmin();
  if (!client) return;
  await client.from("pools").upsert(
    {
      network,
      asset_id: pool.assetId,
      total_shares: pool.totalShares,
      sold_shares: pool.soldShares,
      price_per_share: pool.pricePerShare,
      investor_cap: pool.investorCap,
      rwa_issuer: pool.rwaIssuer,
      rwa_asset_code: pool.rwaAssetCode,
      is_fully_subscribed: pool.isFullySubscribed,
      proceeds_collected: pool.proceedsCollected,
      proceeds_withdrawn: pool.proceedsWithdrawn,
      synced_at: new Date().toISOString(),
    },
    { onConflict: "network,asset_id" },
  );
}

async function refreshRecords(network: string, records: ActivityRecord[]): Promise<void> {
  for (const assetId of uniqueNumbers(records.map(record => record.assetId))) {
    try {
      const asset = await fetchAsset(assetId);
      if (asset) await saveListing(asset);
    } catch {
      continue;
    }
  }

  for (const assetId of uniqueNumbers(
    records.filter(record => POOL_KINDS.has(record.kind)).map(record => record.assetId),
  )) {
    try {
      const pool = poolRecordFromNative(assetId, await fetchPool(assetId));
      if (pool) await writePool(network, pool);
    } catch {
      continue;
    }
  }

  const holdingPairs = records.flatMap(record => {
    if (!HOLDING_KINDS.has(record.kind) || record.assetId === null) return [];
    const accounts = record.kind === "sell_sh" ? [record.account, record.counterparty] : [record.account];
    return accounts.flatMap(account => (account ? [{ assetId: record.assetId as number, account }] : []));
  });
  for (const pair of holdingPairs.slice(0, STATE_REFRESH_LIMIT)) {
    try {
      const shares = await fetchInvestorHoldings(pair.assetId, pair.account);
      const client = getSupabaseAdmin();
      if (!client || shares < 0n) continue;
      await client.from("holdings").upsert(
        {
          network,
          asset_id: pair.assetId,
          account: pair.account,
          shares: shares.toString(),
          synced_at: new Date().toISOString(),
        },
        { onConflict: "network,asset_id,account" },
      );
    } catch {
      continue;
    }
  }

  const accounts = [
    ...new Set(
      records.filter(record => USER_KINDS.has(record.kind) && record.account).map(record => record.account as string),
    ),
  ].slice(0, STATE_REFRESH_LIMIT);
  for (const account of accounts) {
    try {
      const copy = userCopyFromRecord(await fetchUserRecord(account));
      const client = getSupabaseAdmin();
      if (!copy || !client) continue;
      await client.from("users").upsert(
        {
          network,
          account: copy.account,
          status: copy.status,
          metadata_uri: copy.metadataUri,
          commitment: copy.commitment,
          updated_at: copy.updatedAt,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "network,account" },
      );
    } catch {
      continue;
    }
  }
}

async function refreshProtocol(network: string): Promise<void> {
  const { investmentManager } = getContractIds();
  const client = getSupabaseAdmin();
  if (!investmentManager || !client) return;
  try {
    const instance: unknown = await getRpcServer().getContractInstance(investmentManager);
    const current = await client
      .from("protocol")
      .select("fee_bps, fee_treasury, accumulated_fees")
      .eq("network", network)
      .maybeSingle();
    if (current.error) return;
    const feeBps = parseProtocolFeeBps(instance);
    const treasury = readInstanceAddress(instance, "FeeTreasury");
    const accumulated = readInstanceI128(instance, "AccumulatedFees");
    await client.from("protocol").upsert(
      {
        network,
        fee_bps: feeBps === null ? (current.data?.fee_bps ?? null) : feeBps.toString(),
        fee_treasury: treasury ?? current.data?.fee_treasury ?? null,
        accumulated_fees: accumulated === null ? (current.data?.accumulated_fees ?? null) : accumulated.toString(),
        synced_at: new Date().toISOString(),
      },
      { onConflict: "network" },
    );
  } catch {
    return;
  }
}

async function readPage(
  ids: string[],
  stored: StoredCursor,
): Promise<{ events: rpc.Api.EventResponse[]; stored: StoredCursor; caughtUp: boolean } | null> {
  const server = getRpcServer();
  const filters = [{ type: "contract" as const, contractIds: ids }];
  if (stored.cursor) {
    const response = await server.getEvents({ filters, cursor: stored.cursor, limit: EVENT_PAGE_LIMIT });
    return {
      events: response.events,
      stored: {
        cursor: response.events.length > 0 ? response.cursor : stored.cursor,
        scanLedger: null,
      },
      caughtUp: response.events.length < EVENT_PAGE_LIMIT,
    };
  }

  const latest = await server.getLatestLedger();
  let start = stored.scanLedger;
  if (start === null) {
    const probe = await server.getEvents({
      filters,
      startLedger: latest.sequence,
      endLedger: latest.sequence,
      limit: 1,
    });
    start = probe.oldestLedger > 0 ? probe.oldestLedger : 1;
  }
  const end = Math.min(start + LEDGER_WINDOW - 1, latest.sequence);
  const response = await server.getEvents({
    filters,
    startLedger: start,
    endLedger: end,
    limit: EVENT_PAGE_LIMIT,
  });
  if (response.events.length > 0) {
    return {
      events: response.events,
      stored: { cursor: response.cursor, scanLedger: null },
      caughtUp: response.events.length < EVENT_PAGE_LIMIT && end >= latest.sequence,
    };
  }
  const caughtUp = end >= latest.sequence;
  return {
    events: [],
    stored: { cursor: null, scanLedger: caughtUp ? latest.sequence : end + 1 },
    caughtUp,
  };
}

async function storePage(network: string, events: rpc.Api.EventResponse[]): Promise<ActivityRecord[] | null> {
  const records = events.flatMap(event => {
    const record = activityFromEvent(event);
    return record ? [record] : [];
  });
  const saved = await writeActivities(network, records);
  if (!saved) return null;
  await refreshRecords(network, records);
  return records;
}

export async function syncChainActivity(): Promise<ChainSyncResult> {
  if (!listingCopyConfigured()) return { skipped: true, ingested: 0, caughtUp: false, failed: false };
  const ids = contractIds();
  const network = vaulticConfig.targetNetwork;
  if (ids.length === 0) return { skipped: false, ingested: 0, caughtUp: true, failed: false };

  let ingested = 0;
  let caughtUp = false;
  try {
    let stored = await readCursor(network);
    for (let page = 0; page < PAGES_PER_SYNC; page += 1) {
      const next = await readPage(ids, stored);
      if (!next) return { skipped: false, ingested, caughtUp: false, failed: true };
      const records = await storePage(network, next.events);
      if (!records) return { skipped: false, ingested, caughtUp: false, failed: true };
      const cursorSaved = await writeCursor(network, next.stored);
      if (!cursorSaved) return { skipped: false, ingested: ingested + records.length, caughtUp: false, failed: true };
      stored = next.stored;
      ingested += records.length;
      caughtUp = next.caughtUp;
      if (caughtUp) break;
    }
    await refreshProtocol(network);
    return { skipped: false, ingested, caughtUp, failed: false };
  } catch {
    return { skipped: false, ingested, caughtUp: false, failed: true };
  }
}

export async function ingestChainTransaction(txHash: string): Promise<ChainSyncResult> {
  if (!listingCopyConfigured()) return { skipped: true, ingested: 0, caughtUp: false, failed: false };
  const ids = contractIds();
  if (ids.length === 0) return { skipped: false, ingested: 0, caughtUp: true, failed: false };

  try {
    const server = getRpcServer();
    const tx = await server.getTransaction(txHash);
    if (tx.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
      return { skipped: false, ingested: 0, caughtUp: false, failed: false };
    }
    const response = await server.getEvents({
      filters: [{ type: "contract", contractIds: ids }],
      startLedger: tx.ledger,
      endLedger: tx.ledger,
      limit: EVENT_PAGE_LIMIT,
    });
    const records = await storePage(
      vaulticConfig.targetNetwork,
      response.events.filter(event => event.txHash === txHash),
    );
    if (!records) return { skipped: false, ingested: 0, caughtUp: false, failed: true };
    await refreshProtocol(vaulticConfig.targetNetwork);
    return { skipped: false, ingested: records.length, caughtUp: true, failed: false };
  } catch {
    return { skipped: false, ingested: 0, caughtUp: false, failed: true };
  }
}
