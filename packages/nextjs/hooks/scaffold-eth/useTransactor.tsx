/**
 * DEPRECATED — EVM transactor hook. Stub for Stellar migration.
 * Will be replaced with a Stellar transaction helper in Phase 2.
 */
export function useTransactor() {
  return async (_fn: () => Promise<unknown>) => {
    // no-op stub
  };
}
