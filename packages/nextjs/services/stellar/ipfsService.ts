/**
 * Vaultic Trust — IPFS Metadata Service (via Pinata)
 *
 * Handles upload of RWA asset metadata and documents to IPFS.
 * The resulting CID is stored on-chain in the `metadata_uri` field.
 *
 * Setup:
 *   NEXT_PUBLIC_PINATA_JWT=<your Pinata JWT>
 */

const PINATA_UPLOAD_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
const GATEWAY = "https://gateway.pinata.cloud/ipfs";

function getPinataJwt(): string {
  const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
  if (!jwt) {
    throw new Error("NEXT_PUBLIC_PINATA_JWT is not set. Add it to your .env.local file.");
  }
  return jwt;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RWAMetadata = {
  name: string;
  description: string;
  category: string;
  valuation: number;
  currency: string;
  location?: string;
  legalEntity?: string;
  assetCode: string;
  /** URLs of supporting documents (uploaded separately) */
  documents?: string[];
  /** URLs of asset images (uploaded separately) */
  images?: string[];
  /** ISO timestamp */
  createdAt: string;
  /** Vaultic platform version */
  platform: "Vaultic Trust v1";
};

export type PinataUploadResult = {
  cid: string;
  uri: string;
};

// ---------------------------------------------------------------------------
// Upload JSON Metadata
// ---------------------------------------------------------------------------

export async function uploadMetadataToIPFS(metadata: RWAMetadata): Promise<PinataUploadResult> {
  const jwt = getPinataJwt();

  const response = await fetch(PINATA_JSON_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: {
        name: `vaultic-${metadata.assetCode}-metadata.json`,
      },
      pinataOptions: {
        cidVersion: 1,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Pinata metadata upload failed: ${err}`);
  }

  const data = await response.json();
  const cid: string = data.IpfsHash;
  return { cid, uri: `ipfs://${cid}` };
}

// ---------------------------------------------------------------------------
// Upload File (document / image)
// ---------------------------------------------------------------------------

export async function uploadFileToIPFS(file: File, assetCode: string): Promise<PinataUploadResult> {
  const jwt = getPinataJwt();

  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "pinataMetadata",
    JSON.stringify({
      name: `vaultic-${assetCode}-${file.name}`,
    }),
  );
  formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const response = await fetch(PINATA_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Pinata file upload failed: ${err}`);
  }

  const data = await response.json();
  const cid: string = data.IpfsHash;
  return { cid, uri: `ipfs://${cid}` };
}

// ---------------------------------------------------------------------------
// Fetch Metadata from IPFS (via gateway)
// ---------------------------------------------------------------------------

export async function fetchMetadataFromIPFS(metadataUri: string): Promise<RWAMetadata | null> {
  try {
    // Support both ipfs:// and https:// URIs
    let url = metadataUri;
    if (metadataUri.startsWith("ipfs://")) {
      const cid = metadataUri.replace("ipfs://", "");
      url = `${GATEWAY}/${cid}`;
    }
    const response = await fetch(url);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helper: resolve IPFS URI to gateway URL (for <img> tags etc.)
// ---------------------------------------------------------------------------

export function resolveIpfsUrl(uri: string): string {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) {
    return `${GATEWAY}/${uri.replace("ipfs://", "")}`;
  }
  return uri;
}
