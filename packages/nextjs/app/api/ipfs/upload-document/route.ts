import { NextRequest, NextResponse } from "next/server";
import { isIpfsCid } from "~~/utils/vaultic/ipfsCid";
import {
  MAX_LISTING_DOCUMENT_BYTES,
  displayDocumentName,
  isListingDocumentMime,
  listingDocumentExtension,
} from "~~/utils/vaultic/listingDocument";
import { sha256Hex } from "~~/utils/vaultic/sha256";

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

function decodeDocument(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
  const match = /^data:(application\/pdf|image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!match || !isListingDocumentMime(match[1])) return null;
  const bytes = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (bytes.length === 0 || bytes.length > MAX_LISTING_DOCUMENT_BYTES) return null;
  return { mime: match[1], bytes };
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

  const { dataUrl, fileName, sha256 } = body as { dataUrl?: unknown; fileName?: unknown; sha256?: unknown };
  if (typeof dataUrl !== "string" || typeof sha256 !== "string") {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }

  const document = decodeDocument(dataUrl);
  if (!document || !isListingDocumentMime(document.mime)) {
    return NextResponse.json({ error: "use a PDF, JPG, PNG, or WebP under 4 MB" }, { status: 400 });
  }

  const actualHash = await sha256Hex(document.bytes);
  if (actualHash !== sha256) {
    return NextResponse.json({ error: "file hash did not match" }, { status: 400 });
  }

  const extension = listingDocumentExtension(document.mime);
  const name = displayDocumentName(typeof fileName === "string" ? fileName : "").replace(/ /g, "-");
  const storedName = name.includes(".") ? name : `${name}.${extension}`;
  const form = new FormData();
  form.append("file", new Blob([Buffer.from(document.bytes)], { type: document.mime }), storedName);
  form.append(
    "pinataMetadata",
    JSON.stringify({
      name: storedName,
      keyvalues: { project: "VaulticTrust", type: "Asset_Public_File" },
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
  if (!result.IpfsHash || !isIpfsCid(result.IpfsHash)) {
    return NextResponse.json({ error: "pinata upload failed" }, { status: 502 });
  }

  return NextResponse.json({ cid: `ipfs://${result.IpfsHash}`, sha256: actualHash });
}
