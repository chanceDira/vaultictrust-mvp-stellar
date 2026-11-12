import { safeScValToNative } from "./sorobanDecode";
import { xdr } from "@stellar/stellar-sdk";

const ERROR_MAP: Record<string, string> = {
  "already initialized": "Protocol already initialized.",
  "not an admin": "Unauthorized: Admin privileges required.",
  "not authorized": "Action not permitted for your wallet address.",
  "not found": "Target record not found on-chain.",
  "already archived": "Asset is already archived.",
  "invalid transition: burned assets cannot be archived": "Burned assets cannot be archived.",
  "invalid transition: only pending or archived assets can be deleted":
    "Only Pending or Archived assets can be deleted.",
  "invalid transition: must be tokenized or closed to burn": "Asset must be Tokenized or Closed before burning.",
  "model mismatch: burn only applies to fractional assets": "Burn only applies to Fractional assets.",
  "invalid transition: cannot close asset in current state": "Asset cannot be closed from its current state.",
  "no investment pool": "Staging complete. Waiting for tokenization to open.",
  "investor not kyc verified": "KYC Required: Please verify your identity first.",
  "investor cap exceeded": "Investment limit reached for this asset.",
  "insufficient shares available": "Not enough shares remaining.",
  "offering fully subscribed": "Sold out! This offering is closed.",
  "zero purchase amount": "Please enter a valid amount.",
  "purchases are paused": "Purchases are paused.",
  "invalid valuation": "Asset valuation must be positive.",
  "invalid transition": "Invalid Action: Asset state doesn't permit this (e.g. already tokenized).",
  "already registered": "This asset ID is already registered.",
  "not asset owner": "Only the asset owner can perform this action.",
  "model mismatch": "Asset model (Whole/Fractional) does not support this action.",
  "invalid input": "Request contains invalid parameters.",
  "insufficient funds": "Insufficient USDC balance in wallet.",
  "not permitted by contract logic": "Invalid Action: Contract state transition refused.",
  unauthorized: "You lack permissions for this specific contract call.",
  tx_bad_seq: "Sequence Mismatch: Refresh wallet and try again.",
  tx_insufficient_balance: "Insufficient XLM for fees.",
  tx_already_submitted: "Transaction was already processed successfully.",
  tx_no_trust: "Trustline Required: Please add the asset to your wallet.",
  "Error(Contract, #13)": "Trustline Error: Asset not trusted in your wallet.",
  "Error(Contract, #10)": "Insufficient Balance: You don't have enough USDC/XLM.",
  "Error(Contract, #1)": "Protocol State Conflict: Action currently restricted.",
};

export function parseSorobanError(result: any): string | null {
  if (!result) return null;

  const errorStr = result.error?.toString() || "";
  const events = result.diagnosticEvents || result.result?.diagnosticEvents || [];
  const contractMessages: string[] = [];

  for (const event of events) {
    try {
      if (!event || !event.event) continue;
      let body: any = null;
      try {
        body = (event.event as any).body?.();
      } catch {
        continue;
      }
      if (!body) continue;

      const dataVal = body.v0?.()?.data?.();
      if (!dataVal) continue;

      const nativeData = safeScValToNative(dataVal);
      if (typeof nativeData === "string") {
        contractMessages.push(nativeData);
      } else if (Array.isArray(nativeData)) {
        for (const item of nativeData) {
          if (typeof item === "string" && item.length > 1) {
            contractMessages.push(item);
          }
        }
      }
    } catch {}
  }

  const dynamicMessage = contractMessages.join(" | ");

  const joinedSource = `${dynamicMessage} ${errorStr}`.toLowerCase();

  for (const [key, value] of Object.entries(ERROR_MAP)) {
    if (joinedSource.includes(key.toLowerCase())) return value;
  }

  if (dynamicMessage) return dynamicMessage;
  if (errorStr.includes("InvalidAction")) return "Unauthorized or invalid contract state transition.";
  if (errorStr.includes("HostStorageError")) return "Network storage error: Data TTL expired.";
  if (errorStr.includes("Error(Contract, #")) {
    const codeMatch = errorStr.match(/#(\d+)/);
    const code = codeMatch ? codeMatch[1] : "";
    if (code === "13") return "Trustline Required: Asset not trusted or authorized in wallet.";
    if (code === "10") return "Insufficient Balance: You don't have enough USDC/XLM for this action.";
    if (code === "1") return "Invalid Transition: Asset state does not permit this action.";
    return `Contract Error #${code}: Please check inputs and try again.`;
  }

  return errorStr || "Unknown contract error";
}
