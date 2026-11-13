import vaulticConfig from "~~/scaffold.config";
import { fetchAsset, fetchTotalAssetsResult } from "~~/services/stellar/assetRegistryCalls";
import { getSupabaseAdmin } from "~~/services/stellar/listingCopyService";
import {
  type HolderAccount,
  type HolderPoint,
  countShareHolders,
  holderChartLimit,
  readAccountPage,
} from "~~/utils/vaultic/holderCount";

const PAGE_LIMIT = 200;
const MAX_PAGES = 25;
const PAGE_TIMEOUT_MS = 8_000;
const SHARE_CODE = /^[A-Za-z0-9]{1,12}$/;
const ISSUER = /^G[A-Z2-7]{55}$/;
const SNAPSHOT_STATES = new Set(["Tokenized", "Closed", "Relisted"]);

export type HolderSnapshotResult = {
  skipped: boolean;
  failed: boolean;
  recorded: number;
  skippedAssets: number;
};

export type HolderChartRead =
  | { status: "skipped" }
  | { status: "failed" }
  | { status: "ready"; rows: HolderPoint[]; truncated: boolean };

function capturedOnToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function countAssetHolders(code: string, issuer: string): Promise<number | null> {
  const horizon = new URL(vaulticConfig.horizonUrl);
  let nextUrl: string | null =
    `${horizon.origin}/accounts?asset=${encodeURIComponent(`${code}:${issuer}`)}&limit=${PAGE_LIMIT}`;
  const accounts: HolderAccount[] = [];

  for (let page = 0; page < MAX_PAGES && nextUrl; page += 1) {
    const pageUrl = new URL(nextUrl);
    if (pageUrl.origin !== horizon.origin) return null;
    const response = await fetch(nextUrl, { signal: AbortSignal.timeout(PAGE_TIMEOUT_MS) });
    if (!response.ok) return null;
    const parsed = readAccountPage(await response.json());
    if (!parsed) return null;
    accounts.push(...parsed.accounts);
    nextUrl = parsed.accounts.length < PAGE_LIMIT ? null : parsed.next;
  }

  if (nextUrl) return null;
  return countShareHolders(accounts, code, issuer);
}

export async function recordHolderSnapshots(): Promise<HolderSnapshotResult> {
  const client = getSupabaseAdmin();
  if (!client) return { skipped: true, failed: false, recorded: 0, skippedAssets: 0 };

  const total = await fetchTotalAssetsResult();
  if (total === null) return { skipped: false, failed: true, recorded: 0, skippedAssets: 0 };

  const capturedOn = capturedOnToday();
  const network = vaulticConfig.targetNetwork;
  let recorded = 0;
  let skippedAssets = 0;

  for (let assetId = 1; assetId <= total; assetId += 1) {
    const asset = await fetchAsset(assetId);
    const code = typeof asset?.asset_code === "string" ? asset.asset_code : "";
    const issuer = typeof asset?.issuer === "string" ? asset.issuer : "";
    const state = asset?.state?.tag;
    const model = asset?.model?.tag;
    if (model !== "Fractional" || !SNAPSHOT_STATES.has(state) || !SHARE_CODE.test(code) || !ISSUER.test(issuer)) {
      skippedAssets += 1;
      continue;
    }

    const holderCount = await countAssetHolders(code, issuer);
    if (holderCount === null) {
      skippedAssets += 1;
      continue;
    }

    const saved = await client.from("holder_snapshots").upsert(
      {
        network,
        asset_id: assetId,
        captured_on: capturedOn,
        holder_count: holderCount,
        captured_at: new Date().toISOString(),
      },
      { onConflict: "network,asset_id,captured_on" },
    );
    if (saved.error) return { skipped: false, failed: true, recorded, skippedAssets };
    recorded += 1;
  }

  return { skipped: false, failed: false, recorded, skippedAssets };
}

export async function readHolderChart(assetId: number): Promise<HolderChartRead> {
  const client = getSupabaseAdmin();
  if (!client) return { status: "skipped" };

  const limit = holderChartLimit();
  const result = await client
    .from("holder_snapshots")
    .select("captured_on, holder_count")
    .eq("network", vaulticConfig.targetNetwork)
    .eq("asset_id", assetId)
    .order("captured_on", { ascending: false })
    .limit(limit + 1);

  if (result.error || !Array.isArray(result.data)) return { status: "failed" };

  const rows: HolderPoint[] = [];
  for (const entry of result.data.slice(0, limit)) {
    const capturedOn = typeof entry.captured_on === "string" ? entry.captured_on.slice(0, 10) : "";
    const holderCount = entry.holder_count;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(capturedOn) || typeof holderCount !== "number" || !Number.isInteger(holderCount)) {
      return { status: "failed" };
    }
    if (holderCount < 0) return { status: "failed" };
    rows.push({ capturedOn, holderCount });
  }

  return { status: "ready", rows: rows.reverse(), truncated: result.data.length > limit };
}
