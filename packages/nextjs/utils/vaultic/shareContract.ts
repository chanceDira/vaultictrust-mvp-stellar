import { Asset } from "@stellar/stellar-sdk";

export function shareContractId(assetCode: string, issuer: string, passphrase: string): string {
  return new Asset(assetCode, issuer).contractId(passphrase);
}
