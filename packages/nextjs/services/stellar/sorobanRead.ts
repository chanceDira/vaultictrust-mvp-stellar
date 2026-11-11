import { getNetworkPassphrase } from "./horizonClient";
import { getRpcServer } from "./sorobanRpc";
import { BASE_FEE, Contract, TransactionBuilder, rpc, xdr } from "@stellar/stellar-sdk";

const SIM_SOURCE_ACCOUNT_ID = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

export async function simulateReadCall({
  contractId,
  method,
  args,
}: {
  contractId: string;
  method: string;
  args: xdr.ScVal[];
}): Promise<xdr.ScVal | null> {
  const server = getRpcServer();
  const networkPassphrase = getNetworkPassphrase();

  type SdkAccount = ConstructorParameters<typeof TransactionBuilder>[0];
  const simSource: SdkAccount = {
    accountId: () => SIM_SOURCE_ACCOUNT_ID,
    sequenceNumber: () => "0",
    incrementSequenceNumber: () => {},
    sequence: "0",
  } as unknown as SdkAccount;

  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(simSource, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Read simulation failed: ${simResult.error}`);
  }

  try {
    return (simResult as rpc.Api.SimulateTransactionSuccessResponse).result?.retval ?? null;
  } catch {
    return null;
  }
}
