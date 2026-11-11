import { NextRequest, NextResponse } from "next/server";

const IPFS_GATEWAYS = ["https://gateway.pinata.cloud/ipfs/", "https://dweb.link/ipfs/", "https://ipfs.io/ipfs/"];

const CID_PATTERN = /^(?:Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,128})$/;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cid = req.nextUrl.searchParams.get("cid") ?? "";
  if (!CID_PATTERN.test(cid)) {
    return NextResponse.json({ error: "invalid cid" }, { status: 400 });
  }

  for (const gateway of IPFS_GATEWAYS) {
    try {
      const response = await fetch(`${gateway}${cid}`, { next: { revalidate: 300 } });
      if (!response.ok) continue;
      const text = await response.text();
      return NextResponse.json(JSON.parse(text), {
        headers: { "Cache-Control": "public, max-age=300" },
      });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "listing details are unavailable" }, { status: 502 });
}
