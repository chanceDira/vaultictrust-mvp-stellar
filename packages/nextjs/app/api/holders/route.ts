import { NextRequest, NextResponse } from "next/server";
import { readHolderChart } from "~~/services/stellar/holderSnapshotService";

const MAX_ASSET_ID = 1_000_000;
const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest): Promise<NextResponse> {
  const assetId = Number(request.nextUrl.searchParams.get("assetId"));
  if (!Number.isInteger(assetId) || assetId < 1 || assetId > MAX_ASSET_ID) {
    return NextResponse.json({ error: "invalid asset" }, { status: 400, headers: PRIVATE_NO_STORE });
  }

  const result = await readHolderChart(assetId);
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
