import type { SupabaseClient } from "@supabase/supabase-js";
import vaulticConfig from "~~/scaffold.config";
import { getSupabaseAdmin } from "~~/services/stellar/listingCopyService";
import { ACTIVITY_FEED_KINDS, ACTIVITY_FEED_LIMIT, activityFeedFromStored } from "~~/utils/vaultic/activityFeed";
import type { ActivityFeedRow } from "~~/utils/vaultic/activityFeed";

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
