"use client";

import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";

/**
 * Freighter-based connect/disconnect button for the Vaultic Trust header.
 * Shows abbreviated G… address when connected.
 */
export const StellarConnectButton = () => {
  const { publicKey, isConnected, isLoading, isFreighterInstalled, connect, disconnect } = useStellarWallet();

  const shortKey = publicKey ? `${publicKey.slice(0, 5)}…${publicKey.slice(-4)}` : null;

  if (isLoading) {
    return (
      <button className="btn btn-primary btn-sm min-h-9 gap-2" disabled>
        <span className="loading loading-spinner loading-xs" />
        Connecting…
      </button>
    );
  }

  if (isConnected && publicKey) {
    return (
      <div className="dropdown dropdown-end">
        <button tabIndex={0} className="btn btn-primary btn-sm min-h-9 gap-2 font-mono">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
          {shortKey}
        </button>
        <ul tabIndex={0} className="dropdown-content menu rounded-box z-[100] mt-2 w-52 bg-base-100 p-2 shadow-lg border border-base-300">
          <li className="menu-title px-2 pt-1 pb-0">
            <span className="text-xs text-base-content/50 font-mono break-all">{publicKey}</span>
          </li>
          <div className="divider my-1" />
          <li>
            <button onClick={disconnect} className="text-error">
              Disconnect
            </button>
          </li>
        </ul>
      </div>
    );
  }

  return (
    <button className="btn btn-primary btn-sm min-h-9 gap-2" onClick={connect}>
      {!isFreighterInstalled ? (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Install Freighter
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
          Connect Wallet
        </>
      )}
    </button>
  );
};
