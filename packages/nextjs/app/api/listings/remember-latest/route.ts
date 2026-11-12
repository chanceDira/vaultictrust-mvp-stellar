import { NextResponse } from "next/server";
import { fetchAsset, fetchTotalAssets } from "~~/services/stellar/assetRegistryCalls";
import { listingCopyConfigured, saveListing } from "~~/services/stellar/listingCopyService";
import { listingRowFromAsset } from "~~/utils/vaultic/listingCopy";

export async function POST(): Promise<NextResponse> {
  if (!listingCopyConfigured()) {
    return NextResponse.json({ saved: false, skipped: true });
  }

  try {
    const total = await fetchTotalAssets();
    if (!Number.isInteger(total) || total < 1) return NextResponse.json({ saved: false });
    const asset = await fetchAsset(total);
    const row = listingRowFromAsset(asset);
    if (!row) return NextResponse.json({ saved: false });
    const saved = await saveListing(asset);
    return NextResponse.json({ saved, assetId: row.asset_id });
  } catch {
    return NextResponse.json({ saved: false }, { status: 502 });
  }
}
