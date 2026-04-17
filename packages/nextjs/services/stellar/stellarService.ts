import { getHorizonServer, getNetworkPassphrase } from "./horizonClient";
import { signTransaction } from "@stellar/freighter-api";
import { Asset, BASE_FEE, Keypair, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

/**
 * Vaultic Stellar Action Service
 * Handles native Stellar operations: Issuance, Trustlines, and Transfers.
 */

// Placeholder for Testnet USDC - in a real app this would be constant from a known issuer.
export const TESTNET_USDC_ASSET = new Asset(
  "USDC",
  "GBBD47IF6LWLVNC7F7YC6BRS7VSRH6P52MGTW6V3VNDIHUED6KMLKNPB", // Circle Testnet Issuer
);

/**
 * Ensures a user has a trustline for a specific asset.
 */
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
        limit: "1000000000", // Large limit for tokenized shares
      }),
    )
    .setTimeout(30)
    .build();

  // Sign with Freighter
  const signedResult = await signTransaction(transaction.toXDR());
  const signedXdr = typeof signedResult === "string" ? signedResult : (signedResult as any).signedTxXdr;
  return server.submitTransaction(TransactionBuilder.fromXDR(signedXdr, networkPassphrase));
}

/**
 * Executes a purchase of an RWA asset using USDC.
 * Logic: Simple payment of USDC to seller, and seller (or manager) pays RWA tokens to buyer.
 * Or: Path Payment for atomic swap.
 */
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

  // For MVP, we'll build a multi-payment or simple payment transaction.
  // In a real-world scenario, this would be a Soroban contract call or a Path Payment.
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination: issuer, // Paying the issuer/seller
        asset: TESTNET_USDC_ASSET,
        amount: (parseFloat(amount) * parseFloat(pricePerShare)).toString(),
      }),
    )
    .setTimeout(30)
    .build();

  const signedResult = await signTransaction(transaction.toXDR());
  const signedXdr = typeof signedResult === "string" ? signedResult : (signedResult as any).signedTxXdr;
  return server.submitTransaction(TransactionBuilder.fromXDR(signedXdr, networkPassphrase));
}

/**
 * Issues a new RWA asset (for Asset Owners).
 * In Stellar, this involves the Issuer sending the asset to the Distribution account.
 */
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
