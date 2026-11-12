import { NextResponse } from "next/server";
import { syncChainActivity } from "~~/services/stellar/chainActivityService";

export async function GET(): Promise<NextResponse> {
  const result = await syncChainActivity();
  return NextResponse.json(result, { status: result.failed ? 502 : 200 });
}

export async function POST(): Promise<NextResponse> {
  return GET();
}
