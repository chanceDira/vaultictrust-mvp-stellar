import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { recordHolderSnapshots } from "~~/services/stellar/holderSnapshotService";

export const maxDuration = 60;

const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store" };

function cronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization") ?? "";
  if (!secret || !header.startsWith("Bearer ")) return false;
  const provided = Buffer.from(header.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

async function runSnapshot(request: NextRequest): Promise<NextResponse> {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: PRIVATE_NO_STORE });
  }
  const result = await recordHolderSnapshots();
  return NextResponse.json(result, { status: result.failed ? 502 : 200, headers: PRIVATE_NO_STORE });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return runSnapshot(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return runSnapshot(request);
}
