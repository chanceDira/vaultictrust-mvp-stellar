import vaulticConfig from "~~/scaffold.config";
import { fetchAsset, fetchTotalAssetsResult } from "~~/services/stellar/assetRegistryCalls";
import { refreshProtocol, syncChainActivity } from "~~/services/stellar/chainActivityService";
import { recordHolderSnapshots } from "~~/services/stellar/holderSnapshotService";
import { fetchInvestorHoldings, fetchInvestorList, fetchPool } from "~~/services/stellar/investmentCalls";
import {
  copyOffchainRecord,
  getSupabaseAdmin,
  listingCopyConfigured,
  saveListing,
} from "~~/services/stellar/listingCopyService";
import { fetchAllUserAddresses, fetchUserRecord } from "~~/services/stellar/userRegistryCalls";
import { poolRecordFromNative, userCopyFromRecord } from "~~/utils/vaultic/chainActivity";

const MAX_ASSET_ID = 500;
const USER_PAGE_SIZE = 100;
const MAX_USER_PAGES = 20;
const MAX_HOLDERS_PER_ASSET = 100;
const SYNC_ROUNDS = 40;

export type AvailabilityCopyResult = {
  skipped: boolean;
  failed: boolean;
  listings: number;
  details: number;
  files: number;
  pools: number;
  holdings: number;
  users: number;
  activities: number;
  caughtUp: boolean;
  holders: number;
};

function emptyResult(skipped: boolean, failed: boolean): AvailabilityCopyResult {
  return {
    skipped,
    failed,
    listings: 0,
    details: 0,
    files: 0,
    pools: 0,
    holdings: 0,
    users: 0,
    activities: 0,
    caughtUp: false,
    holders: 0,
  };
}

async function savePool(network: string, assetId: number): Promise<boolean> {
  const client = getSupabaseAdmin();
  if (!client) return false;
  const pool = poolRecordFromNative(assetId, await fetchPool(assetId));
  if (!pool) return false;
  const result = await client.from("pools").upsert(
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
  return !result.error;
}

async function saveHolding(network: string, assetId: number, account: string): Promise<boolean> {
  const client = getSupabaseAdmin();
  if (!client) return false;
  const shares = await fetchInvestorHoldings(assetId, account);
  if (shares < 0n) return false;
  const result = await client.from("holdings").upsert(
    {
      network,
      asset_id: assetId,
      account,
      shares: shares.toString(),
      synced_at: new Date().toISOString(),
    },
    { onConflict: "network,asset_id,account" },
  );
  return !result.error;
}

async function saveUser(network: string, account: string): Promise<boolean> {
  const client = getSupabaseAdmin();
  if (!client) return false;
  const copy = userCopyFromRecord(await fetchUserRecord(account));
  if (!copy) return false;
  const result = await client.from("users").upsert(
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
  if (result.error) return false;
  if (copy.metadataUri.length > 0) await copyOffchainRecord(copy.metadataUri);
  return true;
}

async function copyAssets(
  network: string,
  total: number,
): Promise<Pick<AvailabilityCopyResult, "listings" | "details" | "files" | "pools" | "holdings" | "failed">> {
  let listings = 0;
  let details = 0;
  let files = 0;
  let pools = 0;
  let holdings = 0;
  let failed = false;
  const lastId = Math.min(total, MAX_ASSET_ID);

  for (let assetId = 1; assetId <= lastId; assetId += 1) {
    try {
      const asset = await fetchAsset(assetId);
      if (!asset) continue;
      const saved = await saveListing(asset);
      if (!saved) {
        failed = true;
        continue;
      }
      listings += 1;
      if (typeof asset.metadata_uri === "string" && asset.metadata_uri.length > 0) {
        const offchain = await copyOffchainRecord(asset.metadata_uri);
        if (offchain.stored) details += 1;
        files += offchain.files;
      }
    } catch {
      continue;
    }

    try {
      if (await savePool(network, assetId)) pools += 1;
    } catch {
      continue;
    }

    try {
      const investors = await fetchInvestorList(assetId);
      if (!investors) continue;
      for (const account of investors.slice(0, MAX_HOLDERS_PER_ASSET)) {
        if (await saveHolding(network, assetId, account)) holdings += 1;
      }
    } catch {
      continue;
    }
  }

  return { listings, details, files, pools, holdings, failed };
}

async function copyUsers(network: string): Promise<{ users: number; failed: boolean }> {
  let users = 0;
  let failed = false;
  for (let page = 0; page < MAX_USER_PAGES; page += 1) {
    let addresses: string[];
    try {
      addresses = await fetchAllUserAddresses(page * USER_PAGE_SIZE, USER_PAGE_SIZE);
    } catch {
      return { users, failed: true };
    }
    for (const account of addresses) {
      try {
        if (await saveUser(network, account)) users += 1;
        else failed = true;
      } catch {
        failed = true;
      }
    }
    if (addresses.length < USER_PAGE_SIZE) break;
  }
  return { users, failed };
}

async function resetActivityCursor(): Promise<void> {
  const client = getSupabaseAdmin();
  if (!client) return;
  await client.from("chain_cursors").delete().eq("network", vaulticConfig.targetNetwork);
}

async function copyActivity(): Promise<{ activities: number; caughtUp: boolean; failed: boolean }> {
  await resetActivityCursor();
  let activities = 0;
  let caughtUp = false;
  for (let round = 0; round < SYNC_ROUNDS; round += 1) {
    const result = await syncChainActivity();
    if (result.skipped) return { activities, caughtUp: false, failed: false };
    activities += result.ingested;
    caughtUp = result.caughtUp;
    if (result.failed) return { activities, caughtUp, failed: true };
    if (caughtUp) break;
  }
  return { activities, caughtUp, failed: false };
}

export async function copyAvailability(): Promise<AvailabilityCopyResult> {
  if (!listingCopyConfigured()) return emptyResult(true, false);
  const network = vaulticConfig.targetNetwork;
  const total = await fetchTotalAssetsResult();
  if (total === null) return emptyResult(false, true);

  const assets = await copyAssets(network, total);
  const users = await copyUsers(network);
  try {
    await refreshProtocol(network);
  } catch {
    assets.failed = true;
  }
  const activity = await copyActivity();
  let holdersRecorded = 0;
  let holdersFailed = false;
  try {
    const holders = await recordHolderSnapshots();
    holdersRecorded = holders.recorded;
    holdersFailed = holders.failed;
  } catch {
    holdersFailed = true;
  }

  return {
    skipped: false,
    failed: assets.failed || users.failed || activity.failed || holdersFailed,
    listings: assets.listings,
    details: assets.details,
    files: assets.files,
    pools: assets.pools,
    holdings: assets.holdings,
    users: users.users,
    activities: activity.activities,
    caughtUp: activity.caughtUp,
    holders: holdersRecorded,
  };
}
