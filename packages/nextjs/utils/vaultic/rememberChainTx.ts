const TX_HASH = /^[a-fA-F0-9]{64}$/;

export function rememberChainTx(txHash: string): void {
  if (typeof window === "undefined" || !TX_HASH.test(txHash)) return;
  void fetch("/api/chain/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txHash }),
  }).catch(() => undefined);
}
