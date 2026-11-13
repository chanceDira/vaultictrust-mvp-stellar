import { NextRequest, NextResponse } from "next/server";
import { readLatestYieldDeposits } from "~~/services/stellar/activityFeedService";

const MAX_ASSET_ID = 1_000_000;
const MAX_IDS = 40;
const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store" };

function assetIds(value: string | null): number[] | null {
  if (!value) return [];
  const parts = value.split(",");
  if (parts.length > MAX_IDS) return null;
  const ids: number[] = [];
  for (const part of parts) {
    const id = Number(part);
    if (!Number.isInteger(id) || id < 1 || id > MAX_ASSET_ID) return null;
    ids.push(id);
  }
  return ids;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ids = assetIds(request.nextUrl.searchParams.get("assetIds"));
  if (!ids) return NextResponse.json({ error: "invalid asset" }, { status: 400, headers: PRIVATE_NO_STORE });

  const result = await readLatestYieldDeposits(ids);
  if (result.status === "failed") {
    return NextResponse.json({ error: "unavailable" }, { status: 502, headers: PRIVATE_NO_STORE });
  }
  if (result.status === "skipped") {
    return NextResponse.json({ skipped: true, deposits: [] }, { headers: PRIVATE_NO_STORE });
  }
  return NextResponse.json({ skipped: false, deposits: result.deposits }, { headers: PRIVATE_NO_STORE });
}
