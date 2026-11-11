import { getSorobanRpcUrl } from "./horizonClient";
import { rpc } from "@stellar/stellar-sdk";
import vaulticConfig, { deployedSorobanContracts } from "~~/scaffold.config";

let rpcServer: rpc.Server | null = null;

type TxGuard = { begin: () => boolean; end: () => void };
let legacyLock = false;
let txGuard: TxGuard = {
  begin: () => {
    if (legacyLock) return false;
    legacyLock = true;
    return true;
  },
  end: () => {
    legacyLock = false;
  },
};

export function setTxGuard(guard: TxGuard): void {
  txGuard = guard;
}

export function getTxGuard(): TxGuard {
  return txGuard;
}

export function getRpcServer(): rpc.Server {
  if (!rpcServer) {
    rpcServer = new rpc.Server(getSorobanRpcUrl(), { allowHttp: false });
  }
  return rpcServer;
}

export function getContractIds() {
  const contracts = deployedSorobanContracts[vaulticConfig.targetNetwork];
  return {
    registry: contracts?.VaulticAssetRegistry ?? null,
    userRegistry: contracts?.VaulticUserRegistry ?? null,
    investmentManager: contracts?.VaulticInvestmentManager ?? null,
    dividendManager: contracts?.VaulticDividendManager ?? null,
  };
}
