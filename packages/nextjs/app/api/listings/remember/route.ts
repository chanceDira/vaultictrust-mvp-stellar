import { NextRequest, NextResponse } from "next/server";
import { fetchAsset } from "~~/services/stellar/assetRegistryCalls";
import { listingCopyConfigured, saveListing } from "~~/services/stellar/listingCopyService";

const MAX_ASSET_ID = 1_000_000;

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!listingCopyConfigured()) {
    return NextResponse.json({ saved: false, skipped: true });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  const assetId = (body as { assetId?: unknown }).assetId;
  if (typeof assetId !== "number" || !Number.isInteger(assetId) || assetId < 0 || assetId > MAX_ASSET_ID) {
    return NextResponse.json({ error: "invalid asset" }, { status: 400 });
  }

  try {
    const asset = await fetchAsset(assetId);
    if (!asset) return NextResponse.json({ saved: false });
    const saved = await saveListing(asset);
    return NextResponse.json({ saved });
  } catch {
    return NextResponse.json({ saved: false }, { status: 502 });
  }
}
