import type { SignedTransaction } from "@stellar/freighter-api";
import { Asset, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { TESTNET_USDC_ASSET } from "~~/scaffold.config";
import type { HorizonAssetBalance } from "~~/types/horizon";
import { getNetworkPassphrase } from "./horizonClient";
import { getTxGuard } from "./sorobanRpc";

export async function setupUsdcTrustline(callerPublicKey: string) {
  const acquired = getTxGuard().begin();
  if (!acquired) {
    throw new Error("a transaction is already in-flight");
  }

  const { getHorizonServer } = await import("./horizonClient");
  const horizon = getHorizonServer();
  const networkPassphrase = getNetworkPassphrase();

  const RELIABLE_FEE = "1000";

  try {
    const account = await horizon.loadAccount(callerPublicKey);
    const usdcAsset = new Asset(TESTNET_USDC_ASSET.code, TESTNET_USDC_ASSET.issuer);

    const tx = new TransactionBuilder(account, {
      fee: RELIABLE_FEE,
      networkPassphrase,
    })
      .addOperation(
        Operation.changeTrust({
          asset: usdcAsset,
        }),
      )
      .setTimeout(60)
      .build();

    const { signTransaction } = await import("@stellar/freighter-api");
    const signedResult = await signTransaction(tx.toXDR(), {
      networkPassphrase,
    });

    const signedXdr = typeof signedResult === "string" ? signedResult : (signedResult as SignedTransaction).signedTxXdr;
    const response = await horizon.submitTransaction(TransactionBuilder.fromXDR(signedXdr, networkPassphrase));
    return response;
  } catch (e: unknown) {
    throw e;
  } finally {
    getTxGuard().end();
  }
}

export async function fetchUsdcTrustlineStatus(publicKey: string): Promise<{
  hasTrustline: boolean;
  isAuthorized: boolean;
  balance: string;
}> {
  try {
    const { getHorizonServer } = await import("./horizonClient");
    const horizon = getHorizonServer();
    const account = await horizon.loadAccount(publicKey);

    const usdc = account.balances.find(
      b =>
        (b as HorizonAssetBalance).asset_code === TESTNET_USDC_ASSET.code &&
        (b as HorizonAssetBalance).asset_issuer === TESTNET_USDC_ASSET.issuer,
    ) as HorizonAssetBalance | undefined;

    if (!usdc) {
      return { hasTrustline: false, isAuthorized: false, balance: "0" };
    }

    return {
      hasTrustline: true,
      isAuthorized: (usdc as HorizonAssetBalance).is_authorized !== false,
      balance: (usdc as HorizonAssetBalance).balance || "0",
    };
  } catch (e) {
    return { hasTrustline: false, isAuthorized: false, balance: "0" };
  }
}
