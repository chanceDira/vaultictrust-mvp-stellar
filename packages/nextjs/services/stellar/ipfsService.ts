import { notification } from "~~/utils/vaultic";

const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://dweb.link/ipfs/",
  "https://cf-ipfs.com/ipfs/",
];

export function toIpfsCid(uriOrCid: string): string {
  return uriOrCid.replace(/^ipfs:\/\//, "").replace(/^https?:\/\/[^/]+\/ipfs\//, "");
}

export function toIpfsGatewayUrl(uriOrCid: string, gateway = IPFS_GATEWAYS[0]): string {
  return `${gateway}${toIpfsCid(uriOrCid)}`;
}

export async function fetchFromIpfs(uriOrCid: string): Promise<unknown> {
  const cid = toIpfsCid(uriOrCid);
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
