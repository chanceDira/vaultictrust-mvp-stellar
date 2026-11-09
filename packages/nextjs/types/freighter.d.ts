declare module "@stellar/freighter-api" {
  export type SignedTransaction = {
    signedTxXdr: string;
    signerAddress?: string;
  };

  export type NetworkDetails = {
    network: string;
    networkUrl: string;
    networkPassphrase: string;
  };

  export function isConnected(): Promise<{ isConnected: boolean }>;
  export function getAddress(): Promise<{ address: string }>;
  export function requestAccess(): Promise<{ address: string }>;
  export function getNetworkDetails(): Promise<NetworkDetails>;
  export function signTransaction(
    xdr: string,
    opts?: { networkPassphrase?: string; accountToSign?: string },
  ): Promise<string | SignedTransaction>;
}
