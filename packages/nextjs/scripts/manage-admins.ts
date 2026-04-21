import {
  Account,
  Address,
  BASE_FEE,
  Keypair,
  Operation,
  TransactionBuilder,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Vaultic Admin Management CLI Utility
 * 
 * Usage:
 *   export ADMIN_SECRET="S..."
 *   npx ts-node packages/nextjs/scripts/manage-admins.ts add GD...
 *   npx ts-node packages/nextjs/scripts/manage-admins.ts remove GD...
 */

const USER_REGISTRY_CID = "CCFXQOUZSAE7O5NLKJEA4I7I76YDDDKHF3V7EOAZYCMK2X7CIVQ6XSWR"; // From scaffold.config.ts
const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

async function main() {
  const args = process.argv.slice(2);
  const action = args[0]; // 'add' or 'remove'
  const targetAddr = args[1];
  const secretKey = process.env.ADMIN_SECRET;

  if (!secretKey) {
    console.error("❌ Error: ADMIN_SECRET environment variable is required.");
    process.exit(1);
  }

  if (!action || !targetAddr) {
    console.log("Usage: npx ts-node manage-admins.ts <add|remove> <address>");
    process.exit(1);
  }

  const adminKp = Keypair.fromSecret(secretKey);
  const server = new rpc.Server(RPC_URL);

  console.log(`🔍 Connecting to Testnet...`);
  console.log(`👤 Admin Wallet: ${adminKp.publicKey()}`);

  // 1. Fetch current admins
  console.log("📡 Fetching current admins from contract...");
  const getAdminsOp = new TransactionBuilder(new Account(adminKp.publicKey(), "0"), {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.invokeHostFunction({
        func: xdr.HostFunction.hostFunctionTypeInvokeContract(
          new xdr.InvokeContractArgs({
            contractAddress: Address.fromString(USER_REGISTRY_CID).toScAddress(),
            functionName: "get_admins",
            args: [],
          })
        ),
        auth: [],
      })
    )
    .build();

  const response = await server.simulateTransaction(getAdminsOp);
  if (rpc.Api.isSimulationError(response)) {
    throw new Error(`Simulation failed: ${response.error}`);
  }

  const currentAdmins: string[] = scValToNative(response.result!.retval);
  console.log("✅ Current Admins:", currentAdmins);

  // 2. Prepare new list
  let newList: string[];
  if (action === "add") {
    if (currentAdmins.includes(targetAddr)) {
      console.log(`⚠️  Address ${targetAddr} is already an admin.`);
      return;
    }
    newList = [...currentAdmins, targetAddr];
    console.log(`➕ Adding ${targetAddr}...`);
  } else if (action === "remove") {
    if (!currentAdmins.includes(targetAddr)) {
      console.log(`⚠️  Address ${targetAddr} is not an admin.`);
      return;
    }
    newList = currentAdmins.filter((a) => a !== targetAddr);
    if (newList.length === 0) {
      console.error("❌ Error: Cannot remove the last admin.");
      process.exit(1);
    }
    console.log(`➖ Removing ${targetAddr}...`);
  } else {
    console.error("❌ Invalid action. Use 'add' or 'remove'.");
    process.exit(1);
  }

  // 3. Submit set_admins
  console.log("🚀 Submitting on-chain transaction...");
  const adminAddresses = newList.map((addr) => new Address(addr).toScVal());

  const userAccount = await server.getAccount(adminKp.publicKey());
  const tx = new TransactionBuilder(userAccount, {
    fee: "10000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.invokeHostFunction({
        func: xdr.HostFunction.hostFunctionTypeInvokeContract(
          new xdr.InvokeContractArgs({
            contractAddress: Address.fromString(USER_REGISTRY_CID).toScAddress(),
            functionName: "set_admins",
            args: [
              new Address(adminKp.publicKey()).toScVal(),
              xdr.ScVal.scvVec(adminAddresses),
            ],
          })
        ),
        auth: [],
      })
    )
    .build();

  // Prepare and sign
  const preparedTx = await server.prepareTransaction(tx);
  preparedTx.sign(adminKp);

  const submitResponse = await server.sendTransaction(preparedTx);
  if (submitResponse.status !== "PENDING") {
    throw new Error(`Transaction failed: ${JSON.stringify(submitResponse)}`);
  }

  console.log(`⏳ Waiting for consensus (TX: ${submitResponse.hash})...`);
  let statusResponse = await server.getTransaction(submitResponse.hash);
  while (statusResponse.status === "NOT_FOUND" || statusResponse.status === rpc.Api.GetTransactionStatus.SUCCESS === false) {
     await new Promise(r => setTimeout(r, 2000));
     statusResponse = await server.getTransaction(submitResponse.hash);
     if (statusResponse.status === rpc.Api.GetTransactionStatus.FAILED) break;
     if (statusResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) break;
  }

  if (statusResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
    console.log("🎉 SUCCESS! On-chain admins updated.");
    console.log("🔗 View on Stellar Expert:", `https://stellar.expert/explorer/testnet/tx/${submitResponse.hash}`);
  } else {
    console.error("❌ Transaction failed.");
    console.error(statusResponse);
  }
}

main().catch(console.error);
