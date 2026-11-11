import { fetchFromIpfs, toIpfsGatewayUrl } from "~~/services/stellar/ipfsService";

export type AssetMetadata = {
  description: string;
  location: string;
  imageUrl: string | null;
};

function readText(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function readImageUrl(record: Record<string, unknown>): string | null {
  const raw = readText(record, "image") || readText(record, "imageCid");
  if (!raw.startsWith("ipfs://")) return null;
  return toIpfsGatewayUrl(raw);
}

export function parseAssetMetadata(payload: unknown): AssetMetadata | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const description = readText(record, "description");
  const location = readText(record, "location");
  const imageUrl = readImageUrl(record);
  if (!description && !location && !imageUrl) return null;
  return { description, location, imageUrl };
}

export type AssetMetadataLoad = {
  metadata: AssetMetadata | null;
  unavailable: boolean;
};

export async function loadAssetMetadata(uri: string): Promise<AssetMetadataLoad> {
  try {
    return { metadata: parseAssetMetadata(await fetchFromIpfs(uri)), unavailable: false };
  } catch {
    return { metadata: null, unavailable: true };
  }
}

export function formatListedDate(registeredAt: bigint | number): string {
  const seconds = Number(registeredAt);
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  return new Date(seconds * 1000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
