/**
 * DEPRECATED — EVM selected network hook. Stub for Stellar migration.
 */
export type AllowedChainIds = string | number;

export function useSelectedNetwork(_chainId?: AllowedChainIds) {
  return { id: "testnet", name: "Stellar Testnet" };
}
