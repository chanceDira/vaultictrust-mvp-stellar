import { NextRequest, NextResponse } from "next/server";
import { persistOffchainDocument } from "~~/services/stellar/listingCopyService";
import { isIpfsCid } from "~~/utils/vaultic/ipfsCid";

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_PIN_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

export async function POST(req: NextRequest) {
  if (!PINATA_JWT) {
    return NextResponse.json({ error: "IPFS upload is not configured on this server" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  const { content, fileName } = body as { content: unknown; fileName?: string };
  if (!content) {
    return NextResponse.json({ error: "missing content field" }, { status: 400 });
  }

  const pinataBody = {
    pinataContent: content,
    pinataMetadata: {
      name: fileName ?? "vaultic-upload",
      keyvalues: { project: "VaulticTrust", type: "KYC_Encrypted_PII" },
    },
  };

  const response = await fetch(PINATA_PIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: JSON.stringify(pinataBody),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return NextResponse.json(
      { error: (err as Record<string, string>).error ?? "pinata upload failed" },
      { status: 502 },
    );
  }

  const result = (await response.json()) as { IpfsHash?: string };
  if (!result.IpfsHash || !isIpfsCid(result.IpfsHash)) {
    return NextResponse.json({ error: "pinata upload failed" }, { status: 502 });
  }

  await persistOffchainDocument(result.IpfsHash, content);
  return NextResponse.json({ cid: `ipfs://${result.IpfsHash}` });
}
