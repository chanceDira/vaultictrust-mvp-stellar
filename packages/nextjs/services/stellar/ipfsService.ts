import { notification } from "~~/utils/vaultic";
import { type ListingDocument, displayDocumentName } from "~~/utils/vaultic/listingDocument";
import { sha256Hex } from "~~/utils/vaultic/sha256";

const IPFS_GATEWAYS = ["https://gateway.pinata.cloud/ipfs/", "https://dweb.link/ipfs/", "https://ipfs.io/ipfs/"];

export function toIpfsCid(uriOrCid: string): string {
  return uriOrCid.replace(/^ipfs:\/\//, "").replace(/^https?:\/\/[^/]+\/ipfs\//, "");
}

export function toIpfsGatewayUrl(uriOrCid: string, gateway = IPFS_GATEWAYS[0]): string {
  return `${gateway}${toIpfsCid(uriOrCid)}`;
}

export async function fetchFromIpfs(uriOrCid: string): Promise<unknown> {
  const cid = toIpfsCid(uriOrCid);
  if (typeof window !== "undefined") {
    const response = await fetch(`/api/ipfs/read?cid=${encodeURIComponent(cid)}`);
    if (!response.ok) {
      throw new Error("failed to fetch IPFS content");
    }
    return response.json();
  }

  const errors: string[] = [];

  for (const gateway of IPFS_GATEWAYS) {
    const url = `${gateway}${cid}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        errors.push(`${gateway}: HTTP ${response.status}`);
        continue;
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json") || contentType.includes("text/plain")) {
        return await response.json();
      }
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        throw new Error("IPFS payload was not valid JSON");
      }
    } catch (err: unknown) {
      errors.push(`${gateway}: ${err instanceof Error ? err.message : "fetch failed"}`);
    }
  }

  throw new Error(`failed to fetch IPFS content (${cid}). tried: ${errors.join("; ")}`);
}

export async function uploadToIpfs(data: unknown, fileName: string): Promise<string> {
  const response = await fetch("/api/ipfs/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: data, fileName }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "upload failed" }));
    const message = (err as { error?: string }).error ?? "upload failed";
    notification.error(`IPFS upload failed: ${message}`);
    throw new Error(message);
  }

  const result = await response.json();
  return (result as { cid: string }).cid;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Could not read the photo"));
    };
    reader.onerror = () => reject(new Error("Could not read the photo"));
    reader.readAsDataURL(file);
  });
}

export async function uploadImageToIpfs(file: File): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file);
  const response = await fetch("/api/ipfs/upload-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl, fileName: file.name }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "upload failed" }));
    const message = (err as { error?: string }).error ?? "upload failed";
    notification.error(`Photo upload failed: ${message}`);
    throw new Error(message);
  }

  const result = await response.json();
  return (result as { cid: string }).cid;
}

export async function uploadListingDocument(file: File): Promise<ListingDocument> {
  const bytes = await file.arrayBuffer();
  const sha256 = await sha256Hex(bytes);
  const dataUrl = await readFileAsDataUrl(file);
  const response = await fetch("/api/ipfs/upload-document", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl, fileName: file.name, sha256 }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "upload failed" }));
    const message = (err as { error?: string }).error ?? "upload failed";
    notification.error(`File upload failed: ${message}`);
    throw new Error(message);
  }

  const result = (await response.json()) as { cid?: string; sha256?: string };
  if (!result.cid || result.sha256 !== sha256) {
    notification.error("File upload failed: file hash did not match");
    throw new Error("file hash did not match");
  }

  return {
    name: displayDocumentName(file.name),
    cid: result.cid,
    sha256,
    addedAt: new Date().toISOString(),
  };
}
