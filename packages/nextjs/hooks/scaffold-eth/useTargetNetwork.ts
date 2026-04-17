/**
 * DEPRECATED — EVM target network hook. Stub for Stellar migration.
 * Will be replaced with useStellarNetwork in Phase 2.
 */
export function useTargetNetwork() {
  return { targetNetwork: { id: "testnet", name: "Stellar Testnet" } };
}
