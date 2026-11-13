import type { SupabaseClient } from "@supabase/supabase-js";
import vaulticConfig from "~~/scaffold.config";
import { getSupabaseAdmin } from "~~/services/stellar/listingCopyService";
import { ACTIVITY_FEED_KINDS, ACTIVITY_FEED_LIMIT, activityFeedFromStored } from "~~/utils/vaultic/activityFeed";
import type { ActivityFeedRow } from "~~/utils/vaultic/activityFeed";
import type { StoredYieldDeposit } from "~~/utils/vaultic/yieldDepositNote";

const ACTIVITY_COLUMNS =
  "event_id, ledger, ledger_closed_at, tx_hash, kind, asset_id, account, counterparty, amount, amount_secondary, amount_tertiary";

export type ActivityFeedRead =
  | { status: "skipped" }
  | { status: "failed" }
  | { status: "ready"; rows: ActivityFeedRow[]; truncated: boolean };

function activityQuery(client: SupabaseClient, network: string) {
  return client
    .from("activities")
    .select(ACTIVITY_COLUMNS)
    .eq("network", network)
    .in("kind", [...ACTIVITY_FEED_KINDS])
    .order("ledger", { ascending: false })
    .order("event_id", { ascending: false })
    .limit(ACTIVITY_FEED_LIMIT + 1);
}

export async function readActivityFeed(filter: { assetId: number } | { account: string }): Promise<ActivityFeedRead> {
  const client = getSupabaseAdmin();
  if (!client) return { status: "skipped" };

  const network = vaulticConfig.targetNetwork;
  const query =
    "assetId" in filter
      ? activityQuery(client, network).eq("asset_id", filter.assetId)
      : activityQuery(client, network).or(`account.eq.${filter.account},counterparty.eq.${filter.account}`);
  const result = await query;
  if (result.error || !Array.isArray(result.data)) return { status: "failed" };

  const rows = result.data
    .map(activityFeedFromStored)
    .filter((row): row is ActivityFeedRow => row !== null)
    .slice(0, ACTIVITY_FEED_LIMIT);
  return {
    status: "ready",
    rows,
    truncated: result.data.length > ACTIVITY_FEED_LIMIT,
  };
}

const MAX_YIELD_NOTE_ASSETS = 40;

export type YieldDepositRead =
  | { status: "skipped" }
  | { status: "failed" }
  | { status: "ready"; deposits: StoredYieldDeposit[] };

export async function readLatestYieldDeposits(assetIds: readonly number[]): Promise<YieldDepositRead> {
  const client = getSupabaseAdmin();
  if (!client) return { status: "skipped" };
  if (assetIds.length > MAX_YIELD_NOTE_ASSETS) return { status: "failed" };

  const network = vaulticConfig.targetNetwork;
  const reads = await Promise.all(assetIds.map(assetId => latestDeposit(client, network, assetId)));
  const deposits: StoredYieldDeposit[] = [];
  for (const read of reads) {
    if (read === "failed") return { status: "failed" };
    if (read) deposits.push(read);
  }
  return { status: "ready", deposits };
}

async function latestDeposit(
  client: SupabaseClient,
  network: string,
  assetId: number,
): Promise<StoredYieldDeposit | null | "failed"> {
  const result = await client
    .from("activities")
    .select("ledger, ledger_closed_at, asset_id")
    .eq("network", network)
    .eq("kind", "yld_dep")
    .eq("asset_id", assetId)
    .order("ledger", { ascending: false })
    .limit(1);
  if (result.error || !Array.isArray(result.data)) return "failed";
  const entry = result.data[0];
  if (!entry) return null;
  const ledger = entry.ledger;
  if (typeof ledger !== "number" || !Number.isInteger(ledger) || entry.asset_id !== assetId) return "failed";
  const occurredAt = typeof entry.ledger_closed_at === "string" ? entry.ledger_closed_at : null;
  return { assetId, occurredAt, ledger };
}
