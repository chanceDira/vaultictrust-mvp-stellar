/**
 * Stellar Horizon API client
 * Used for querying on-chain data from the Stellar network.
 */
import { Horizon } from "@stellar/stellar-sdk";
import vaulticConfig from "~~/scaffold.config";

let _horizonServer: Horizon.Server | null = null;

export function getHorizonServer(): Horizon.Server {
  if (!_horizonServer) {
    _horizonServer = new Horizon.Server(vaulticConfig.horizonUrl, { allowHttp: false });
  }
  return _horizonServer;
}

export function getSorobanRpcUrl(): string {
  return vaulticConfig.sorobanRpcUrl;
}

export function getNetworkPassphrase(): string {
  return vaulticConfig.networkPassphrase;
}

/**
 * Returns a shortened Stellar address for display purposes.
 * e.g. GBQB…VYZ3
 */
export function shortenStellarAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 1) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}
