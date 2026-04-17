/**
 * DEPRECATED — EVM write contract hook. Stub for Stellar migration.
 */
export function useScaffoldWriteContract(_config: any) {
  return { writeContractAsync: () => Promise.resolve(), isPending: false };
}
