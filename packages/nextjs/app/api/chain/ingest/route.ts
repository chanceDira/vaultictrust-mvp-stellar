import { NextRequest, NextResponse } from "next/server";
import { ingestChainTransaction } from "~~/services/stellar/chainActivityService";

const TX_HASH = /^[a-fA-F0-9]{64}$/;

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  const txHash = (body as { txHash?: unknown }).txHash;
  if (typeof txHash !== "string" || !TX_HASH.test(txHash)) {
    return NextResponse.json({ error: "invalid transaction" }, { status: 400 });
  }

  const result = await ingestChainTransaction(txHash);
  return NextResponse.json(result, { status: result.failed ? 502 : 200 });
}
