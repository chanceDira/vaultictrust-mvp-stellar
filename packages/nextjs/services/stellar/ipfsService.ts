import { notification } from "~~/utils/scaffold-eth";

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;

export async function uploadToIpfs(data: any, fileName: string): Promise<string> {
  if (!PINATA_JWT) {
    notification.error(
      "Pinata API Key missing. Please add NEXT_PUBLIC_PINATA_JWT to your .env.local to enable real IPFS uploads.",
    );
    throw new Error("Missing Pinata Credentials");
  }

  const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;

  const body = {
    pinataContent: data,
    pinataMetadata: {
      name: fileName,
      keyvalues: {
        project: "VaulticTrust",
        type: "KYC_Encrypted_PII",
      },
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to upload to Pinata");
    }

    const result = await response.json();
    return `ipfs://${result.IpfsHash}`;
  } catch (error: any) {
    console.error("[IPFS] Upload error:", error);
    throw error;
  }
}
