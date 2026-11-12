import { NextRequest, NextResponse } from "next/server";
import { isIpfsCid } from "~~/utils/vaultic/ipfsCid";
import { MAX_LISTING_DOCUMENT_BYTES } from "~~/utils/vaultic/listingDocument";

const IPFS_GATEWAYS = ["https://gateway.pinata.cloud/ipfs/", "https://dweb.link/ipfs/", "https://ipfs.io/ipfs/"];

function mediaType(bytes: Uint8Array): string | null {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "application/pdf";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cid = req.nextUrl.searchParams.get("cid") ?? "";
  if (!isIpfsCid(cid)) {
    return NextResponse.json({ error: "invalid cid" }, { status: 400 });
  }

  for (const gateway of IPFS_GATEWAYS) {
    try {
      const response = await fetch(`${gateway}${cid}`, { next: { revalidate: 300 } });
      if (!response.ok) continue;
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength === 0 || bytes.byteLength > MAX_LISTING_DOCUMENT_BYTES) continue;
      const type = mediaType(bytes);
      if (!type) continue;
      return new NextResponse(Buffer.from(bytes), {
        headers: {
          "Content-Type": type,
          "Cache-Control": "public, max-age=300",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "file is unavailable" }, { status: 502 });
}
