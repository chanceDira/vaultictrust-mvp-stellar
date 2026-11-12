import { NextRequest, NextResponse } from "next/server";
import { loadPublicFile } from "~~/services/stellar/listingCopyService";
import { isIpfsCid } from "~~/utils/vaultic/ipfsCid";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cid = req.nextUrl.searchParams.get("cid") ?? "";
  if (!isIpfsCid(cid)) {
    return NextResponse.json({ error: "invalid cid" }, { status: 400 });
  }

  const file = await loadPublicFile(cid);
  if (!file) {
    return NextResponse.json({ error: "file is unavailable" }, { status: 502 });
  }

  return new NextResponse(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
