/**
 * DEPRECATED — EVM contract utilities. Stub for TS compatibility during Stellar migration.
 * These types will be replaced by Soroban contract types in Phase 2.
 * The viem/wagmi imports are removed.
 */

export type ContractName = string;
export type GenericContract = { address: string; abi: unknown[] };
export type GenericContractsDeclaration = Record<number, Record<string, GenericContract>>;
export type InheritedFunctions = Record<string, string>;
export type ContractCodeStatus = "LOADING" | "DEPLOYED" | "NOT_FOUND";
export const ContractCodeStatusEnum = { LOADING: "LOADING", DEPLOYED: "DEPLOYED", NOT_FOUND: "NOT_FOUND" } as const;

export type AllowedChainIds = string | number;

// Stubs for types referenced by dead-code hooks
export type AbiFunctionInputs<_A, _F extends string> = readonly unknown[];
export type AbiFunctionArguments<_A, _F extends string> = readonly unknown[];
export type AbiFunctionOutputs<_A, _F extends string> = readonly unknown[];
export type AbiFunctionReturnType<_A, _F extends string> = unknown;
export type ContractAbi<_T extends ContractName = ContractName> = unknown[];
export type UseDeployedContractConfig<T extends ContractName> = { contractName: T; chainId?: AllowedChainIds };

export const contracts: GenericContractsDeclaration | null = null;

export const getParsedErrorWithAllAbis = (error: unknown, _chainId: AllowedChainIds): string =>
  String(error);

export const simulateContractWriteAndNotifyError = async (_params: unknown): Promise<void> => {
  // no-op stub
};
