export const MAX_LISTING_DOCUMENT_BYTES = 4_000_000;
export const MAX_LISTING_DOCUMENTS = 6;

const LISTING_DOCUMENT_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;

export type ListingDocumentMime = (typeof LISTING_DOCUMENT_MIME_TYPES)[number];

export type ListingDocument = {
  name: string;
  cid: string;
  sha256: string;
  addedAt: string;
};

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export function isListingDocumentMime(value: string): value is ListingDocumentMime {
  return (LISTING_DOCUMENT_MIME_TYPES as readonly string[]).includes(value);
}

export function listingDocumentExtension(mime: ListingDocumentMime): string {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export function displayDocumentName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "";
  const cleaned = base
    .replace(/[^\w.\- ()]/g, "")
    .trim()
    .slice(0, 80);
  return cleaned.length > 0 ? cleaned : "Listing file";
}

export function isListingDocument(value: unknown): value is ListingDocument {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.name === "string" &&
    record.name.trim().length > 0 &&
    typeof record.cid === "string" &&
    record.cid.startsWith("ipfs://") &&
    typeof record.sha256 === "string" &&
    SHA256_PATTERN.test(record.sha256) &&
    typeof record.addedAt === "string" &&
    record.addedAt.length > 0
  );
}

export function readListingDocuments(value: unknown): ListingDocument[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isListingDocument).map(document => ({
    name: document.name.trim(),
    cid: document.cid,
    sha256: document.sha256,
    addedAt: document.addedAt,
  }));
}
