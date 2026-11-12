import type { StellarNetworkId } from "~~/scaffold.config";
import { publishedNetworkName } from "~~/utils/vaultic/contractDirectory";

export function networkRiskLine(networkId: StellarNetworkId): string {
  const networkName = publishedNetworkName(networkId);
  if (networkId === "mainnet") {
    return `This app is on ${networkName}. A testnet balance is not a balance on this network.`;
  }
  return `This app is on ${networkName}. A balance on this network is not a mainnet balance.`;
}
