import type { OnChainAsset } from "~~/types/stellar";
import { assetFromListingRow, visibleAssetsFromRows } from "~~/utils/vaultic/listingCopy";

const STORAGE_KEY = "vtrust.listingCopyIds";
const MAX_REMEMBERED_IDS = 500;
const MAX_REMEMBER_PER_LOAD = 40;

type RememberOutcome = "saved" | "miss" | "skip" | "stop";

let copyDisabled = false;
let draining = false;
let rememberedThisLoad = 0;
const pendingIds: number[] = [];

function readRemembered(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is number => typeof id === "number" && Number.isInteger(id)));
  } catch {
    return new Set();
  }
}

function markRemembered(assetId: number): void {
  if (typeof window === "undefined") return;
  const ids = [...readRemembered(), assetId].slice(-MAX_REMEMBERED_IDS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    return;
  }
}

async function postRemember(assetId: number): Promise<RememberOutcome> {
  try {
    const response = await fetch("/api/listings/remember", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId }),
    });
    if (!response.ok) return "stop";
    const body = (await response.json()) as { saved?: unknown; skipped?: unknown };
    if (body.skipped === true) return "skip";
    return body.saved === true ? "saved" : "miss";
  } catch {
    return "stop";
  }
}

async function drainRememberQueue(): Promise<void> {
  if (draining) return;
  draining = true;
  while (pendingIds.length > 0 && rememberedThisLoad < MAX_REMEMBER_PER_LOAD && !copyDisabled) {
    const assetId = pendingIds.shift();
    if (assetId === undefined) break;
    rememberedThisLoad += 1;
    const outcome = await postRemember(assetId);
    if (outcome === "skip") {
      copyDisabled = true;
      pendingIds.length = 0;
      break;
    }
    if (outcome === "stop") {
      pendingIds.length = 0;
      break;
    }
    if (outcome === "saved") markRemembered(assetId);
  }
  draining = false;
}

export function rememberListing(assetId: number): void {
  if (copyDisabled || typeof window === "undefined") return;
  void postRemember(assetId).then(outcome => {
    if (outcome === "skip") copyDisabled = true;
    if (outcome === "saved") markRemembered(assetId);
  });
}

export function rememberListingsOnce(assetIds: number[]): void {
  if (copyDisabled || typeof window === "undefined" || rememberedThisLoad >= MAX_REMEMBER_PER_LOAD) return;
  const remembered = readRemembered();
  for (const assetId of assetIds) {
    if (remembered.has(assetId) || pendingIds.includes(assetId)) continue;
    pendingIds.push(assetId);
  }
  void drainRememberQueue();
}

export function rememberLatestListing(): void {
  if (copyDisabled || typeof window === "undefined") return;
  void fetch("/api/listings/remember-latest", { method: "POST" })
    .then(async response => {
      if (!response.ok) return;
      const body = (await response.json()) as { saved?: unknown; skipped?: unknown; assetId?: unknown };
      if (body.skipped === true) copyDisabled = true;
      if (body.saved === true && typeof body.assetId === "number") markRemembered(body.assetId);
    })
    .catch(() => undefined);
}

export async function fetchStoredListings(): Promise<OnChainAsset[]> {
  try {
    const response = await fetch("/api/listings");
    if (!response.ok) return [];
    return visibleAssetsFromRows(await response.json());
  } catch {
    return [];
  }
}

export async function fetchStoredListing(assetId: number): Promise<OnChainAsset | null> {
  try {
    const response = await fetch(`/api/listings?assetId=${assetId}`);
    if (!response.ok) return null;
    return assetFromListingRow(await response.json());
  } catch {
    return null;
  }
}
