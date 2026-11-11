import type { SignedTransaction } from "@stellar/freighter-api";
import { Contract, TransactionBuilder, rpc, xdr } from "@stellar/stellar-sdk";
import { getNetworkPassphrase } from "./horizonClient";
import { parseSorobanError } from "./sorobanErrors";
import { getRpcServer, getTxGuard } from "./sorobanRpc";

export async function callContract({
  contractId,
  method,
  args,
  callerPublicKey,
}: {
  contractId: string;
  method: string;
  args: xdr.ScVal[];
  callerPublicKey: string;
}): Promise<{ result: xdr.ScVal | null; hash: string }> {
  const server = getRpcServer();
  const networkPassphrase = getNetworkPassphrase();
  const contract = new Contract(contractId);

  const acquired = getTxGuard().begin();
  if (!acquired) {
    throw new Error("a transaction is already in-flight");
  }

  const RELIABLE_FEE = "1000";

  try {
    const account = await server.getAccount(callerPublicKey);

    const tx = new TransactionBuilder(account, {
      fee: RELIABLE_FEE,
      networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(60)
      .build();

    const simResult = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simResult)) {
      const errorMsg = parseSorobanError(simResult);
      throw new Error(errorMsg || `Simulation failed: ${simResult.error}`);
    }

    const preparedTx = rpc.assembleTransaction(tx, simResult).build();

    const { signTransaction } = await import("@stellar/freighter-api");
    const signedResult = await signTransaction(preparedTx.toXDR(), {
      networkPassphrase,
    });
    const signedXdr = typeof signedResult === "string" ? signedResult : (signedResult as SignedTransaction).signedTxXdr;

    const submittedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
    const response = await server.sendTransaction(submittedTx);

    if (response.status === "ERROR") {
      const errXdr = response.errorResult?.toXDR("base64") ?? "unknown error";
      throw new Error(`Submission failed: ${errXdr}`);
    }

    let pollResult: Awaited<ReturnType<typeof server.getTransaction>> | null = null;
    let pollAttempts = 0;

    function isXdrDecodeError(e: any): boolean {
      const msg: string = e?.message ?? "";
      return (
        msg.includes("Bad union switch") ||
        msg.includes("bad union switch") ||
        msg.includes("XdrParseError") ||
        msg.includes("xdr parse") ||
        msg.includes("invalid xdr") ||
        msg.includes("unknown union")
      );
    }

    try {
      pollResult = await server.getTransaction(response.hash);
    } catch (xdrErr: any) {
      if (isXdrDecodeError(xdrErr)) {
        return { result: null, hash: response.hash };
      }
      throw xdrErr;
    }

    while (pollResult?.status === rpc.Api.GetTransactionStatus.NOT_FOUND && pollAttempts < 30) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        pollResult = await server.getTransaction(response.hash);
      } catch (xdrErr: any) {
        if (isXdrDecodeError(xdrErr)) {
          return { result: null, hash: response.hash };
        }
        throw xdrErr;
      }
      pollAttempts++;
    }

    if (pollResult?.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      let result = null;
      try {
        const rawResult = (pollResult as rpc.Api.GetSuccessfulTransactionResponse).returnValue;
        if (rawResult) result = rawResult;
      } catch (e) {}
      return { result, hash: response.hash };
    }

    if (pollResult?.status === rpc.Api.GetTransactionStatus.FAILED) {
      const errorMessage = parseSorobanError(pollResult);
      throw new Error(errorMessage || `Transaction failed on-chain. Hash: ${response.hash}`);
    }

    throw new Error(
      `Transaction did not finalize (Status: ${pollResult?.status ?? "timeout"}). Check explorer for hash: ${response.hash}`,
    );
  } catch (e: unknown) {
    throw e;
  } finally {
    getTxGuard().end();
  }
}
