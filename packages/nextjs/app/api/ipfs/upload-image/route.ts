import { NextRequest, NextResponse } from "next/server";
import { MAX_ASSET_PHOTO_BYTES, isAssetPhotoMime } from "~~/utils/vaultic/assetPhoto";

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

function decodePhoto(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!match || !isAssetPhotoMime(match[1])) return null;
  const bytes = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (bytes.length === 0 || bytes.length > MAX_ASSET_PHOTO_BYTES) return null;
  return { mime: match[1], bytes };
}

function safeFileName(name: string, mime: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80);
  if (cleaned.length > 0) return cleaned;
  if (mime === "image/png") return "asset-photo.png";
  if (mime === "image/webp") return "asset-photo.webp";
  return "asset-photo.jpg";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!PINATA_JWT) {
    return NextResponse.json({ error: "IPFS upload is not configured on this server" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  const { dataUrl, fileName } = body as { dataUrl?: unknown; fileName?: unknown };
  if (typeof dataUrl !== "string") {
    return NextResponse.json({ error: "missing photo" }, { status: 400 });
  }

  const photo = decodePhoto(dataUrl);
  if (!photo) {
    return NextResponse.json({ error: "photo must be a JPG, PNG, or WebP under 1.2 MB" }, { status: 400 });
  }

  const name = safeFileName(typeof fileName === "string" ? fileName : "", photo.mime);
  const form = new FormData();
  form.append("file", new Blob([Buffer.from(photo.bytes)], { type: photo.mime }), name);
  form.append(
    "pinataMetadata",
    JSON.stringify({
      name,
      keyvalues: { project: "VaulticTrust", type: "Asset_Public_Image" },
    }),
  );

  const response = await fetch(PINATA_FILE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: form,
  });

  if (!response.ok) {
    return NextResponse.json({ error: "pinata upload failed" }, { status: 502 });
  }

  const result = (await response.json()) as { IpfsHash?: string };
  if (!result.IpfsHash) {
    return NextResponse.json({ error: "pinata upload failed" }, { status: 502 });
  }

  return NextResponse.json({ cid: `ipfs://${result.IpfsHash}` });
}
