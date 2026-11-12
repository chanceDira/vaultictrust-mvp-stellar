import { NextRequest, NextResponse } from "next/server";
import { readActivityFeed } from "~~/services/stellar/activityFeedService";

const MAX_ASSET_ID = 1_000_000;
const STELLAR_ACCOUNT = /^[GC][A-Z2-7]{55}$/;
const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store" };

function feedResponse(result: Awaited<ReturnType<typeof readActivityFeed>>): NextResponse {
  if (result.status === "failed") {
    return NextResponse.json({ error: "unavailable" }, { status: 502, headers: PRIVATE_NO_STORE });
  }
  if (result.status === "skipped") {
    return NextResponse.json({ skipped: true, rows: [], truncated: false }, { headers: PRIVATE_NO_STORE });
  }
  return NextResponse.json(
    { skipped: false, rows: result.rows, truncated: result.truncated },
    { headers: PRIVATE_NO_STORE },
  );
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const assetId = req.nextUrl.searchParams.get("assetId");
  const account = req.nextUrl.searchParams.get("account");
  if ((assetId === null) === (account === null)) {
    return NextResponse.json({ error: "invalid query" }, { status: 400 });
  }

  if (assetId !== null) {
    const id = Number(assetId);
    if (!Number.isInteger(id) || id < 1 || id > MAX_ASSET_ID) {
      return NextResponse.json({ error: "invalid asset" }, { status: 400 });
    }
    return feedResponse(await readActivityFeed({ assetId: id }));
  }

  if (!account || !STELLAR_ACCOUNT.test(account)) {
    return NextResponse.json({ error: "invalid account" }, { status: 400 });
  }
  return feedResponse(await readActivityFeed({ account }));
}
