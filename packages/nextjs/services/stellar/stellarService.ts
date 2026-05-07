import { getHorizonServer, getNetworkPassphrase } from "./horizonClient";
import { signTransaction } from "@stellar/freighter-api";
import { Asset, BASE_FEE, Keypair, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

export const TESTNET_USDC_ASSET = new Asset("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");

export async function setupTrustline(publicKey: string, assetCode: string, issuer: string) {
  const server = getHorizonServer();
  const networkPassphrase = getNetworkPassphrase();
  const asset = new Asset(assetCode, issuer);

  const account = await server.loadAccount(publicKey);

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      Operation.changeTrust({
        asset: asset,
        limit: "1000000000",
      }),
    )
    .setTimeout(30)
    .build();

  const signedResult = await signTransaction(transaction.toXDR(), { networkPassphrase });
  const signedXdr = typeof signedResult === "string" ? signedResult : (signedResult as any).signedTxXdr;

  try {
    return await server.submitTransaction(TransactionBuilder.fromXDR(signedXdr, networkPassphrase));
  } catch (error: any) {
    console.error("[stellarService] setupTrustline error details:", error?.response?.data || error);
    if (error?.response?.data?.extras?.result_codes) {
      console.error("[stellarService] extras.result_codes:", error.response.data.extras.result_codes);
    }
    throw error;
  }
}

export async function purchaseRWAAsset(
  buyerPublicKey: string,
  assetCode: string,
  issuer: string,
  amount: string,
  pricePerShare: string,
) {
  const server = getHorizonServer();
  const networkPassphrase = getNetworkPassphrase();

  const account = await server.loadAccount(buyerPublicKey);

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination: issuer,
        asset: TESTNET_USDC_ASSET,
        amount: (parseFloat(amount) * parseFloat(pricePerShare)).toString(),
      }),
    )
    .setTimeout(30)
    .build();

  const signedResult = await signTransaction(transaction.toXDR(), { networkPassphrase });
  const signedXdr = typeof signedResult === "string" ? signedResult : (signedResult as any).signedTxXdr;
  return server.submitTransaction(TransactionBuilder.fromXDR(signedXdr, networkPassphrase));
}

export async function issueRWAAsset(
  issuerKeypair: Keypair,
  distributionAddress: string,
  assetCode: string,
  amount: string,
) {
  const server = getHorizonServer();
  const networkPassphrase = getNetworkPassphrase();
  const asset = new Asset(assetCode, issuerKeypair.publicKey());

  const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());

  const transaction = new TransactionBuilder(issuerAccount, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination: distributionAddress,
        asset: asset,
        amount: amount,
      }),
    )
    .setTimeout(30)
    .build();

  transaction.sign(issuerKeypair);
  return server.submitTransaction(transaction);
}
