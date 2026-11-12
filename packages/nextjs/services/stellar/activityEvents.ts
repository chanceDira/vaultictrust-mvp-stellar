import { fetchAsset } from "./assetRegistryCalls";
import { safeScValToNative } from "./sorobanDecode";
import { getContractIds, getRpcServer } from "./sorobanRpc";
import { Address, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import type { ActivityRow } from "~~/utils/vaultic/activityRecord";
import { decodeActivity } from "~~/utils/vaultic/activityRecord";

const EVENT_PAGE_LIMIT = 100;
const MAX_ACTIVITY_EVENTS = 200;
const LEDGER_LOOKBACK = 120_000;
const SALE_SYMBOLS = ["buy_sh", "buy_whl"] as const;
const YIELD_SYMBOLS = ["yld_dep", "yld_clm", "yld_all"] as const;

type ChainEvent = {
  id: string;
  ledgerClosedAt: string;
  txHash: string;
  inSuccessfulContractCall: boolean;
  topic: xdr.ScVal[];
  value: xdr.ScVal;
};

function symbolTopic(symbol: string): string {
  return nativeToScVal(symbol, { type: "symbol" }).toXDR("base64");
}

function assetTopic(assetId: number): string {
  return nativeToScVal(assetId, { type: "u32" }).toXDR("base64");
}

function accountTopic(account: string): string {
  return new Address(account).toScVal().toXDR("base64");
}

function eventFilters(
  second: string,
  third: string,
): { type: "contract"; contractIds: string[]; topics: string[][] }[] {
  const { investmentManager, dividendManager } = getContractIds();
  const filters: { type: "contract"; contractIds: string[]; topics: string[][] }[] = [];
  if (investmentManager) {
    for (const symbol of SALE_SYMBOLS) {
      filters.push({
        type: "contract",
        contractIds: [investmentManager],
        topics: [[symbolTopic(symbol), second, third]],
      });
    }
  }
  if (dividendManager) {
    for (const symbol of YIELD_SYMBOLS) {
      filters.push({
        type: "contract",
        contractIds: [dividendManager],
        topics: [[symbolTopic(symbol), second, third]],
      });
    }
  }
  return filters;
}

function oldestLedgerFromError(error: unknown): number | null {
  const message = error instanceof Error ? `${error.message} ${String(error.cause ?? "")}` : String(error);
  const match = /ledger range[^0-9]*(\d+)\s*-\s*(\d+)/i.exec(message);
  if (!match) return null;
  return Number(match[1]);
}

async function readEvents(second: string, third: string): Promise<ChainEvent[]> {
  const filters = eventFilters(second, third);
  if (filters.length === 0) return [];

  const server = getRpcServer();
  const latest = await server.getLatestLedger();
  let startLedger = Math.max(1, latest.sequence - LEDGER_LOOKBACK);
  let page;
  try {
    page = await server.getEvents({ startLedger, filters, limit: EVENT_PAGE_LIMIT });
  } catch (error) {
    const oldest = oldestLedgerFromError(error);
    if (oldest === null) throw error;
    page = await server.getEvents({ startLedger: oldest, filters, limit: EVENT_PAGE_LIMIT });
  }

  const events: ChainEvent[] = [];
  const seen = new Set<string>();
  const take = (batch: ChainEvent[]) => {
    for (const event of batch) {
      if (seen.has(event.id) || events.length >= MAX_ACTIVITY_EVENTS) continue;
      seen.add(event.id);
      events.push(event);
    }
  };

  take(page.events);
  let cursor = page.cursor;
  while (events.length < MAX_ACTIVITY_EVENTS && page.events.length === EVENT_PAGE_LIMIT) {
    page = await server.getEvents({ cursor, filters, limit: EVENT_PAGE_LIMIT });
    if (page.events.length === 0 || page.cursor === cursor) break;
    cursor = page.cursor;
    take(page.events);
  }
  return events;
}

function toRows(events: ChainEvent[]): ActivityRow[] {
  const rows: ActivityRow[] = [];
  for (const event of events) {
    if (!event.inSuccessfulContractCall) continue;
    const decoded = decodeActivity(
      event.topic.map(topic => safeScValToNative(topic)),
      safeScValToNative(event.value),
    );
    if (!decoded) continue;
    rows.push({
      ...decoded,
      id: event.id,
      ledgerClosedAt: event.ledgerClosedAt,
      assetCode: null,
      txHash: event.txHash,
    });
  }
  rows.sort((left, right) => {
    if (left.ledgerClosedAt === right.ledgerClosedAt) return right.id.localeCompare(left.id);
    return left.ledgerClosedAt < right.ledgerClosedAt ? 1 : -1;
  });
  return rows;
}

async function attachAssetCodes(rows: ActivityRow[]): Promise<ActivityRow[]> {
  const ids = [...new Set(rows.map(row => row.assetId))];
  const codes = new Map<number, string>();
  await Promise.all(
    ids.map(async assetId => {
      try {
        const asset = await fetchAsset(assetId);
        const code = asset?.asset_code;
        if (typeof code === "string" && code.length > 0) codes.set(assetId, code);
      } catch {
        return;
      }
    }),
  );
  return rows.map(row => ({ ...row, assetCode: codes.get(row.assetId) ?? null }));
}

export async function fetchListingActivity(assetId: number): Promise<ActivityRow[]> {
  const events = await readEvents(assetTopic(assetId), "*");
  return toRows(events);
}

export async function fetchWalletActivity(account: string): Promise<ActivityRow[]> {
  const events = await readEvents("*", accountTopic(account));
  return attachAssetCodes(toRows(events));
}
