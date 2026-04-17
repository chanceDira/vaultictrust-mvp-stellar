/**
 * DEPRECATED — EVM deployed contract info hook. Stub for Stellar migration.
 */
import { ContractCodeStatusEnum, ContractName, UseDeployedContractConfig } from "~~/utils/scaffold-eth/contract";

export function useDeployedContractInfo<TContractName extends ContractName>(
  _configOrName: UseDeployedContractConfig<TContractName> | TContractName,
) {
  return { data: undefined, isLoading: false, status: ContractCodeStatusEnum.NOT_FOUND };
}
