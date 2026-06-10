"use client";

import { ChevronDownIcon, WalletIcon } from "@heroicons/react/24/outline";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";

export const StellarConnectButton = () => {
  const { publicKey, isConnected, isLoading, isFreighterInstalled, connect, disconnect } = useStellarWallet();

  const shortKey = publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}` : null;
  const mobileKey = publicKey ? `${publicKey.slice(0, 4)}...${publicKey.slice(-3)}` : null;

  if (isLoading) {
    return (
      <button
        className="btn btn-primary btn-xs min-h-8 min-w-[5.5rem] px-2 sm:btn-sm sm:min-h-9 sm:min-w-[7.5rem] sm:px-3"
        disabled
      >
        <span className="loading loading-bars loading-xs" />
        <span className="hidden sm:inline">Connecting</span>
      </button>
    );
  }

  if (isConnected && publicKey) {
    return (
      <div className="dropdown dropdown-end">
        <button
          tabIndex={0}
          type="button"
          aria-label={`Wallet ${publicKey}`}
          className="btn btn-primary btn-xs min-h-8 min-w-[6.75rem] gap-1.5 rounded-xl px-2.5 font-mono text-[10px] sm:btn-sm sm:min-h-9 sm:min-w-[11rem] sm:gap-2 sm:px-4 sm:text-xs"
        >
          <WalletIcon className="h-3.5 w-3.5 shrink-0 opacity-90 sm:h-4 sm:w-4" />
          <span className="truncate sm:hidden">{mobileKey}</span>
          <span className="hidden truncate sm:inline">{shortKey}</span>
          <ChevronDownIcon className="hidden h-3.5 w-3.5 shrink-0 opacity-70 sm:inline" />
        </button>
        <ul
          tabIndex={0}
          className="dropdown-content menu z-[100] mt-2 w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
        >
          <li className="menu-title px-2 pt-1 pb-0">
            <span className="break-all font-mono text-xs text-base-content/50">{publicKey}</span>
          </li>
          <div className="divider my-1" />
          <li>
            <button type="button" onClick={disconnect} className="text-error">
              Disconnect
            </button>
          </li>
        </ul>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-primary btn-xs min-h-8 min-w-[5.5rem] px-2.5 sm:btn-sm sm:min-h-9 sm:min-w-[8.5rem] sm:gap-2 sm:px-4"
      onClick={connect}
    >
      {!isFreighterInstalled ? (
        <>
          <span className="sm:hidden">Install</span>
          <span className="hidden sm:inline">Install Freighter</span>
        </>
      ) : (
        <>
          <WalletIcon className="h-4 w-4 sm:hidden" />
          <span className="sm:hidden">Connect</span>
          <span className="hidden sm:inline">Connect Wallet</span>
        </>
      )}
    </button>
  );
};
