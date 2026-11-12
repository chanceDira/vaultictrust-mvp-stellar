import { NextRequest, NextResponse } from "next/server";
import { readListing, readVisibleListingRows } from "~~/services/stellar/listingCopyService";
import { listingRowFromAsset } from "~~/utils/vaultic/listingCopy";

const MAX_ASSET_ID = 1_000_000;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const assetId = req.nextUrl.searchParams.get("assetId");
  if (assetId === null) {
    return NextResponse.json(await readVisibleListingRows());
  }

  const id = Number(assetId);
  if (!Number.isInteger(id) || id < 0 || id > MAX_ASSET_ID) {
    return NextResponse.json({ error: "invalid asset" }, { status: 400 });
  }

  const row = listingRowFromAsset(await readListing(id));
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(row);
}
