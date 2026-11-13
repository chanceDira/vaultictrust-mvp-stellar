import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import type { OnChainAsset } from "~~/types/stellar";
import { isIpfsCid } from "~~/utils/vaultic/ipfsCid";
import {
  type ListingCopy,
  type ListingRow,
  assetFromListingRow,
  classifyOffchainPayload,
  imageCidFromMetadata,
  listingMetadataPayload,
  listingRowFromAsset,
  listingStorageUrl,
  visibleAssetsFromRows,
  withStoredImage,
} from "~~/utils/vaultic/listingCopy";
import { MAX_LISTING_DOCUMENT_BYTES, readListingDocuments } from "~~/utils/vaultic/listingDocument";
import { listingFileType } from "~~/utils/vaultic/listingFileType";

const LISTING_FILES_BUCKET = "listing-files";
const IPFS_GATEWAYS = ["https://gateway.pinata.cloud/ipfs/", "https://dweb.link/ipfs/", "https://ipfs.io/ipfs/"];
const COPY_TIMEOUT_MS = 4_000;

let admin: SupabaseClient | null = null;

type SupabaseKeyEnv = {
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

export function readSupabaseAdminKey(env: NodeJS.ProcessEnv | SupabaseKeyEnv = process.env): string | null {
  const secret = env.SUPABASE_SECRET_KEY?.trim();
  if (secret) return secret;
  const legacy = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return legacy ? legacy : null;
}

export function listingCopyConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && readSupabaseAdminKey());
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!listingCopyConfigured()) return null;
  if (admin) return admin;
  const url = process.env.SUPABASE_URL;
  const key = readSupabaseAdminKey();
  if (!url || !key) return null;
  admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(COPY_TIMEOUT_MS) }),
    },
  });
  return admin;
}

export async function savePublicBytes(cid: string, bytes: Uint8Array, mime: string): Promise<boolean> {
  const client = getSupabaseAdmin();
  const sniffed = listingFileType(bytes);
  if (
    !client ||
    !isIpfsCid(cid) ||
    !sniffed ||
    sniffed !== mime ||
    bytes.byteLength === 0 ||
    bytes.byteLength > MAX_LISTING_DOCUMENT_BYTES
  ) {
    return false;
  }

  const kind = sniffed === "application/pdf" ? "document" : "image";
  try {
    const uploaded = await client.storage.from(LISTING_FILES_BUCKET).upload(cid, Buffer.from(bytes), {
      contentType: sniffed,
      upsert: true,
    });
    if (uploaded.error) return false;
    const row = await client.from("public_files").upsert(
      {
        cid,
        mime: sniffed,
        byte_size: bytes.byteLength,
        kind,
        copied_at: new Date().toISOString(),
      },
      { onConflict: "cid" },
    );
    return !row.error;
  } catch {
    return false;
  }
}

export async function readStoredFile(cid: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  const client = getSupabaseAdmin();
  if (!client || !isIpfsCid(cid)) return null;
  try {
    const meta = await client.from("public_files").select("mime").eq("cid", cid).maybeSingle();
    const mime = meta.data?.mime;
    if (meta.error || typeof mime !== "string") return null;
    const downloaded = await client.storage.from(LISTING_FILES_BUCKET).download(cid);
    if (downloaded.error || !downloaded.data) return null;
    const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
    if (listingFileType(bytes) !== mime) return null;
    return { bytes, mime };
  } catch {
    return null;
  }
}

export async function storedFileUrl(cid: string): Promise<string | null> {
  const client = getSupabaseAdmin();
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!client || !supabaseUrl || !isIpfsCid(cid)) return null;
  try {
    const meta = await client.from("public_files").select("cid").eq("cid", cid).maybeSingle();
    if (meta.error || !meta.data) return null;
    return listingStorageUrl(supabaseUrl, cid);
  } catch {
    return null;
  }
}

async function fetchGatewayFile(cid: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const response = await fetch(`${gateway}${cid}`);
      if (!response.ok) continue;
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength === 0 || bytes.byteLength > MAX_LISTING_DOCUMENT_BYTES) continue;
      const mime = listingFileType(bytes);
      if (!mime) continue;
      return { bytes, mime };
    } catch {
      continue;
    }
  }
  return null;
}

export async function loadPublicFile(cid: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  const stored = await readStoredFile(cid);
  if (stored) return stored;
  const fetched = await fetchGatewayFile(cid);
  if (!fetched) return null;
  await savePublicBytes(cid, fetched.bytes, fetched.mime);
  return fetched;
}

export async function persistOffchainDocument(cid: string, content: unknown): Promise<void> {
  const client = getSupabaseAdmin();
  if (!client || !isIpfsCid(cid)) return;
  const copy = classifyOffchainPayload(content);
  if (!copy) return;
  const copiedAt = new Date().toISOString();
  try {
    if (copy.kind === "listing") {
      await client.from("listing_media").upsert(
        {
          metadata_cid: cid,
          description: copy.description,
          location: copy.location,
          image_cid: copy.imageCid,
          documents: copy.documents,
          copied_at: copiedAt,
        },
        { onConflict: "metadata_cid" },
      );
      return;
    }
    await client.from("encrypted_records").upsert(
      {
        cid,
        ciphertext: copy.ciphertext,
        iv: copy.iv,
        encrypted_key: copy.encryptedKey,
        copied_at: copiedAt,
      },
      { onConflict: "cid" },
    );
  } catch {
    return;
  }
}

export async function readListingMetadata(cid: string): Promise<Record<string, unknown> | null> {
  const client = getSupabaseAdmin();
  if (!client || !isIpfsCid(cid)) return null;
  try {
    const result = await client
      .from("listing_media")
      .select("description, location, image_cid, documents")
      .eq("metadata_cid", cid)
      .maybeSingle();
    if (result.error || !result.data) return null;
    const imageCid = typeof result.data.image_cid === "string" ? result.data.image_cid : null;
    const copy: ListingCopy = {
      kind: "listing",
      description: typeof result.data.description === "string" ? result.data.description : "",
      location: typeof result.data.location === "string" ? result.data.location : "",
      imageCid,
      documents: readListingDocuments(result.data.documents),
    };
    return listingMetadataPayload(copy);
  } catch {
    return null;
  }
}

export async function readEncryptedDocument(
  cid: string,
): Promise<{ encryptedDocument: { ciphertext: string; iv: string; encryptedKey: string; salt: string } } | null> {
  const client = getSupabaseAdmin();
  if (!client || !isIpfsCid(cid)) return null;
  try {
    const result = await client
      .from("encrypted_records")
      .select("ciphertext, iv, encrypted_key")
      .eq("cid", cid)
      .maybeSingle();
    const ciphertext = result.data?.ciphertext;
    const iv = result.data?.iv;
    const encryptedKey = result.data?.encrypted_key;
    if (result.error || typeof ciphertext !== "string" || typeof iv !== "string" || typeof encryptedKey !== "string") {
      return null;
    }
    return { encryptedDocument: { ciphertext, iv, encryptedKey, salt: "" } };
  } catch {
    return null;
  }
}

export async function presentListingMetadata(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const cid = imageCidFromMetadata(payload);
  if (!cid) return payload;
  return withStoredImage(payload, await storedFileUrl(cid));
}

export async function saveListing(asset: unknown): Promise<boolean> {
  const client = getSupabaseAdmin();
  const row = listingRowFromAsset(asset);
  if (!client || !row) return false;
  try {
    const result = await client
      .from("listings")
      .upsert({ ...row, synced_at: new Date().toISOString() }, { onConflict: "asset_id" });
    return !result.error;
  } catch {
    return false;
  }
}

export async function readListing(assetId: number): Promise<OnChainAsset | null> {
  const client = getSupabaseAdmin();
  if (!client || !Number.isInteger(assetId) || assetId < 0) return null;
  try {
    const result = await client.from("listings").select("*").eq("asset_id", assetId).maybeSingle();
    if (result.error || !result.data) return null;
    return assetFromListingRow(result.data);
  } catch {
    return null;
  }
}

export async function readVisibleListingRows(): Promise<ListingRow[]> {
  const client = getSupabaseAdmin();
  if (!client) return [];
  try {
    const result = await client
      .from("listings")
      .select("*")
      .in("state", ["Active", "Tokenized"])
      .order("asset_id", { ascending: false });
    if (result.error || !result.data) return [];
    return visibleAssetsFromRows(result.data).flatMap(asset => {
      const row = listingRowFromAsset(asset);
      return row ? [row] : [];
    });
  } catch {
    return [];
  }
}
