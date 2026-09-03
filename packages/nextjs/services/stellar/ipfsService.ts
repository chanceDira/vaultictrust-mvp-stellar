import { notification } from "~~/utils/vaultic";

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;

/** Public gateways that typically allow browser CORS (ipfs.io often returns 403). */
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

/**
 * Fetch JSON (or text) from IPFS via public gateways.
 * Prefers Pinata because KYC payloads are pinned there; falls back if a gateway blocks CORS.
 */
export async function fetchFromIpfs(uriOrCid: string): Promise<any> {
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
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json") || contentType.includes("text/plain")) {
        return await response.json();
      }
      // Some gateways omit content-type; try JSON then fail clearly.
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        throw new Error("IPFS payload was not valid JSON");
      }
    } catch (err: any) {
      errors.push(`${gateway}: ${err.message || "fetch failed"}`);
    }
  }

  throw new Error(`Failed to fetch IPFS content (${cid}). Tried: ${errors.join("; ")}`);
}

export async function uploadToIpfs(data: any, fileName: string): Promise<string> {
  if (!PINATA_JWT) {
    notification.error(
      "Pinata API Key missing. Please add NEXT_PUBLIC_PINATA_JWT to your .env.local to enable real IPFS uploads.",
    );
    throw new Error("Missing Pinata Credentials");
  }

  const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;

  const body = {
    pinataContent: data,
    pinataMetadata: {
      name: fileName,
      keyvalues: {
        project: "VaulticTrust",
        type: "KYC_Encrypted_PII",
      },
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to upload to Pinata");
    }

    const result = await response.json();
    return `ipfs://${result.IpfsHash}`;
  } catch (error: any) {
    console.error("[IPFS] Upload error:", error);
    throw error;
  }
}
