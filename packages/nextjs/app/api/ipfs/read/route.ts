import { NextRequest, NextResponse } from "next/server";
import {
  listingCopyConfigured,
  loadPublicFile,
  persistOffchainDocument,
  presentListingMetadata,
  readEncryptedDocument,
  readListingMetadata,
} from "~~/services/stellar/listingCopyService";
import { isIpfsCid } from "~~/utils/vaultic/ipfsCid";
import { classifyOffchainPayload, imageCidFromMetadata } from "~~/utils/vaultic/listingCopy";

const IPFS_GATEWAYS = ["https://gateway.pinata.cloud/ipfs/", "https://dweb.link/ipfs/", "https://ipfs.io/ipfs/"];
const IMAGE_COPY_TIMEOUT_MS = 4_000;

async function readGatewayJson(cid: string): Promise<unknown | null> {
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const response = await fetch(`${gateway}${cid}`, { next: { revalidate: 300 } });
      if (!response.ok) continue;
      return JSON.parse(await response.text()) as unknown;
    } catch {
      continue;
    }
  }
  return null;
}

async function copyListingImage(payload: unknown): Promise<void> {
  if (!listingCopyConfigured()) return;
  const cid = imageCidFromMetadata(payload);
  if (!cid) return;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<void>(resolve => {
    timeout = setTimeout(resolve, IMAGE_COPY_TIMEOUT_MS);
  });
  await Promise.race([
    loadPublicFile(cid)
      .then(() => undefined)
      .catch(() => undefined),
    expired,
  ]);
  if (timeout) clearTimeout(timeout);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cid = req.nextUrl.searchParams.get("cid") ?? "";
  if (!isIpfsCid(cid)) {
    return NextResponse.json({ error: "invalid cid" }, { status: 400 });
  }

  const remote = await readGatewayJson(cid);
  if (remote !== null && remote !== undefined) {
    if (typeof remote === "object") {
      const record = remote as Record<string, unknown>;
      await persistOffchainDocument(cid, record);
      await copyListingImage(record);
      const body = await presentListingMetadata(record);
      const encrypted = classifyOffchainPayload(record)?.kind === "encrypted";
      return NextResponse.json(body, {
        headers: { "Cache-Control": encrypted ? "private, no-store" : "public, max-age=300" },
      });
    }
    return NextResponse.json(remote, { headers: { "Cache-Control": "public, max-age=300" } });
  }

  const stored = await readListingMetadata(cid);
  if (stored) {
    return NextResponse.json(await presentListingMetadata(stored), {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  }

  const encrypted = await readEncryptedDocument(cid);
  if (encrypted) {
    return NextResponse.json(encrypted, { headers: { "Cache-Control": "private, no-store" } });
  }

  return NextResponse.json({ error: "listing details are unavailable" }, { status: 502 });
}
