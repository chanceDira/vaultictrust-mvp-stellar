import type { AssetStateKey, OnChainAsset, OwnershipModelKey } from "~~/types/stellar";
import { isIpfsCid } from "~~/utils/vaultic/ipfsCid";
import { type ListingDocument, readListingDocuments } from "~~/utils/vaultic/listingDocument";

const ASSET_STATES: readonly AssetStateKey[] = [
  "Pending",
  "Active",
  "Tokenized",
  "Closed",
  "Relisted",
  "Archived",
  "Burned",
];
const OWNERSHIP_MODELS: readonly OwnershipModelKey[] = ["WholeOwnership", "Fractional"];
const VISIBLE_STATES = new Set<AssetStateKey>(["Active", "Tokenized"]);
const MAX_TEXT_CHARS = 8_000;
const MAX_CIPHERTEXT_CHARS = 8_000_000;
const MAX_IV_CHARS = 512;
const MAX_ENCRYPTED_KEY_CHARS = 4_096;
const MAX_NAME_CHARS = 80;
const MAX_CODE_CHARS = 32;
const MAX_CATEGORY_CHARS = 40;
const MAX_ADDRESS_CHARS = 64;
const MAX_URI_CHARS = 200;
const LISTING_FILE_PREFIX = "/storage/v1/object/public/listing-files/";
const STROOPS_PATTERN = /^(?:0|[1-9]\d*)$/;

export type ListingCopy = {
  kind: "listing";
  description: string;
  location: string;
  imageCid: string | null;
  documents: ListingDocument[];
};

export type EncryptedCopy = {
  kind: "encrypted";
  ciphertext: string;
  iv: string;
  encryptedKey: string;
};

export type OffchainCopy = ListingCopy | EncryptedCopy;

export type ListingRow = {
  asset_id: number;
  asset_code: string;
  asset_name: string;
  asset_category: string;
  state: AssetStateKey;
  model: OwnershipModelKey;
  owner: string;
  issuer: string | null;
  valuation: string;
  total_shares: string;
  sold_shares: string;
  price_per_share: string;
  metadata_uri: string;
  registered_at: string;
};

function isAssetState(value: string): value is AssetStateKey {
  return (ASSET_STATES as readonly string[]).includes(value);
}

function isOwnershipModel(value: string): value is OwnershipModelKey {
  return (OWNERSHIP_MODELS as readonly string[]).includes(value);
}

function readText(record: Record<string, unknown>, key: string, maxChars: number): string {
  const value = record[key];
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxChars);
}

function readEncrypted(value: unknown): EncryptedCopy | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const ciphertext = record.ciphertext;
  const iv = record.iv;
  const encryptedKey = record.encryptedKey;
  if (typeof ciphertext !== "string" || typeof iv !== "string" || typeof encryptedKey !== "string") return null;
  if (ciphertext.length === 0 || ciphertext.length > MAX_CIPHERTEXT_CHARS) return null;
  if (iv.length === 0 || iv.length > MAX_IV_CHARS) return null;
  if (encryptedKey.length === 0 || encryptedKey.length > MAX_ENCRYPTED_KEY_CHARS) return null;
  return { kind: "encrypted", ciphertext, iv, encryptedKey };
}

export function imageCidFromMetadata(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const image = (payload as Record<string, unknown>).image;
  if (typeof image !== "string" || !image.startsWith("ipfs://")) return null;
  const cid = image.slice("ipfs://".length);
  return isIpfsCid(cid) ? cid : null;
}

export function classifyOffchainPayload(content: unknown): OffchainCopy | null {
  if (!content || typeof content !== "object") return null;
  const record = content as Record<string, unknown>;
  if (record.encryptedDocument || record.applicant || typeof record.ciphertext === "string") {
    return readEncrypted(record.encryptedDocument) ?? readEncrypted(record);
  }

  const description = readText(record, "description", MAX_TEXT_CHARS);
  const location = readText(record, "location", MAX_TEXT_CHARS);
  const imageRaw = readText(record, "image", MAX_URI_CHARS) || readText(record, "imageCid", MAX_URI_CHARS);
  const imageCid = imageRaw.startsWith("ipfs://") && isIpfsCid(imageRaw.slice("ipfs://".length)) ? imageRaw : null;
  const documents = readListingDocuments(record.documents);
  if (!description && !location && !imageCid && documents.length === 0) return null;
  return { kind: "listing", description, location, imageCid, documents };
}

export function listingMetadataPayload(copy: ListingCopy): Record<string, unknown> {
  return {
    description: copy.description,
    location: copy.location,
    ...(copy.imageCid ? { image: copy.imageCid } : {}),
    ...(copy.documents.length > 0 ? { documents: copy.documents } : {}),
  };
}

export function isListingStorageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const supabaseHost = url.hostname === "supabase.co" || url.hostname.endsWith(".supabase.co");
    return url.protocol === "https:" && supabaseHost && url.pathname.startsWith(LISTING_FILE_PREFIX);
  } catch {
    return false;
  }
}

export function listingStorageUrl(supabaseUrl: string, cid: string): string | null {
  if (!isIpfsCid(cid)) return null;
  try {
    const base = new URL(supabaseUrl);
    return `${base.origin}${LISTING_FILE_PREFIX}${cid}`;
  } catch {
    return null;
  }
}

export function withStoredImage(payload: Record<string, unknown>, storageUrl: string | null): Record<string, unknown> {
  if (!storageUrl || !isListingStorageUrl(storageUrl)) return payload;
  const image = payload.image;
  if (typeof image !== "string" || !image.startsWith("ipfs://")) return payload;
  return { ...payload, image: storageUrl };
}

function stroopText(value: unknown): string | null {
  if (typeof value === "bigint") {
    if (value < 0n) return null;
    return value.toString();
  }
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  if (typeof value === "string" && STROOPS_PATTERN.test(value)) return value;
  return null;
}

function readAddress(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_ADDRESS_CHARS) return null;
  return trimmed;
}

export function listingRowFromAsset(asset: unknown): ListingRow | null {
  if (!asset || typeof asset !== "object") return null;
  const record = asset as OnChainAsset;
  if (!Number.isInteger(record.asset_id) || record.asset_id < 0) return null;
  const state = record.state?.tag;
  const model = record.model?.tag;
  if (!isAssetState(state) || !isOwnershipModel(model)) return null;
  const owner = readAddress(record.asset_owner);
  const assetName = typeof record.asset_name === "string" ? record.asset_name.trim().slice(0, MAX_NAME_CHARS) : "";
  const assetCode = typeof record.asset_code === "string" ? record.asset_code.trim().slice(0, MAX_CODE_CHARS) : "";
  if (!owner || !assetName || !assetCode) return null;

  const valuation = stroopText(record.valuation);
  const totalShares = stroopText(record.total_shares);
  const soldShares = stroopText(record.sold_shares);
  const pricePerShare = stroopText(record.price_per_share);
  const registeredAt = stroopText(record.registered_at);
  if (!valuation || !totalShares || !soldShares || !pricePerShare || registeredAt === null) return null;

  const metadataUri =
    typeof record.metadata_uri === "string" && record.metadata_uri.startsWith("ipfs://")
      ? record.metadata_uri.slice(0, MAX_URI_CHARS)
      : "";
  const issuer = readAddress(record.issuer);

  return {
    asset_id: record.asset_id,
    asset_code: assetCode,
    asset_name: assetName,
    asset_category:
      typeof record.asset_category === "string" ? record.asset_category.trim().slice(0, MAX_CATEGORY_CHARS) : "",
    state,
    model,
    owner,
    issuer,
    valuation,
    total_shares: totalShares,
    sold_shares: soldShares,
    price_per_share: pricePerShare,
    metadata_uri: metadataUri,
    registered_at: registeredAt,
  };
}

export function assetFromListingRow(row: unknown): OnChainAsset | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const assetId = record.asset_id;
  const state = record.state;
  const model = record.model;
  if (typeof assetId !== "number" || !Number.isInteger(assetId) || assetId < 0) return null;
  if (typeof state !== "string" || !isAssetState(state)) return null;
  if (typeof model !== "string" || !isOwnershipModel(model)) return null;

  const valuation = stroopText(record.valuation);
  const totalShares = stroopText(record.total_shares);
  const soldShares = stroopText(record.sold_shares);
  const pricePerShare = stroopText(record.price_per_share);
  const registeredAt = stroopText(record.registered_at);
  const owner = readAddress(record.owner);
  const assetName = typeof record.asset_name === "string" ? record.asset_name.trim() : "";
  const assetCode = typeof record.asset_code === "string" ? record.asset_code.trim() : "";
  if (!valuation || !totalShares || !soldShares || !pricePerShare || registeredAt === null) return null;
  if (!owner || !assetName || !assetCode) return null;

  const metadataUri = typeof record.metadata_uri === "string" ? record.metadata_uri : "";
  const issuer = readAddress(record.issuer);

  return {
    asset_id: assetId,
    asset_name: assetName,
    asset_category: typeof record.asset_category === "string" ? record.asset_category : "",
    asset_code: assetCode,
    asset_owner: owner,
    state: { tag: state },
    model: { tag: model },
    valuation: BigInt(valuation),
    total_shares: BigInt(totalShares),
    price_per_share: BigInt(pricePerShare),
    sold_shares: BigInt(soldShares),
    metadata_uri: metadataUri,
    registered_at: BigInt(registeredAt),
    issuer,
  };
}

export function visibleAssetsFromRows(rows: unknown): OnChainAsset[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap(row => {
    const asset = assetFromListingRow(row);
    return asset && VISIBLE_STATES.has(asset.state.tag) ? [asset] : [];
  });
}
