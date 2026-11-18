import { NextRequest, NextResponse } from "next/server";
import { loadPublicFile, storedFileUrl } from "~~/services/stellar/listingCopyService";
import { isIpfsCid } from "~~/utils/vaultic/ipfsCid";

const FILE_CACHE = "public, max-age=300";

function redirectToStored(url: string): NextResponse {
  const response = NextResponse.redirect(url, 307);
  response.headers.set("Cache-Control", FILE_CACHE);
  return response;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cid = req.nextUrl.searchParams.get("cid") ?? "";
  if (!isIpfsCid(cid)) {
    return NextResponse.json({ error: "invalid cid" }, { status: 400 });
  }

  const stored = await storedFileUrl(cid);
  if (stored) return redirectToStored(stored);

  const file = await loadPublicFile(cid);
  if (!file) {
    return NextResponse.json({ error: "file is unavailable" }, { status: 502 });
  }

  const saved = await storedFileUrl(cid);
  if (saved) return redirectToStored(saved);

  return new NextResponse(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": FILE_CACHE,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
