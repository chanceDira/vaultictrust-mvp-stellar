"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * Stellar wallet context (Freighter)
 * Wraps @stellar/freighter-api to provide a clean React interface.
 */

interface StellarWalletContextValue {
  publicKey: string | null;
  isConnected: boolean;
  isLoading: boolean;
  isFreighterInstalled: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  network: string | null;
}

const StellarWalletContext = createContext<StellarWalletContextValue>({
  publicKey: null,
  isConnected: false,
  isLoading: false,
  isFreighterInstalled: false,
  connect: async () => {},
  disconnect: () => {},
  network: null,
});

export const StellarWalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFreighterInstalled, setIsFreighterInstalled] = useState(false);
  const [network, setNetwork] = useState<string | null>(null);

  // Check Freighter installation and existing session on mount
  useEffect(() => {
    const checkFreighter = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const freighter = await import("@stellar/freighter-api");
        const { isConnected: connected } = await freighter.isConnected();
        setIsFreighterInstalled(connected !== undefined);

        if (connected) {
          setIsFreighterInstalled(true);
          try {
            const { address } = await freighter.getAddress();
            if (address) {
              setPublicKey(address);
              setIsConnected(true);
              // Get network
              const { network: net } = await freighter.getNetworkDetails();
              setNetwork(net ?? null);
            }
          } catch {
            // Not yet authorized — that's fine
          }
        }
      } catch {
        setIsFreighterInstalled(false);
      }
    };

    checkFreighter();
  }, []);

  const connect = useCallback(async () => {
    setIsLoading(true);
    try {
      const freighter = await import("@stellar/freighter-api");

      const { isConnected: installed } = await freighter.isConnected();
      if (!installed) {
        window.open("https://www.freighter.app/", "_blank");
        return;
      }

      const { address } = await freighter.requestAccess();
      if (address) {
        setPublicKey(address);
        setIsConnected(true);
        setIsFreighterInstalled(true);
        const { network: net } = await freighter.getNetworkDetails();
        setNetwork(net ?? null);
      }
    } catch (err) {
      console.error("[Stellar] Connection failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setIsConnected(false);
    setNetwork(null);
  }, []);

  return (
    <StellarWalletContext.Provider
      value={{ publicKey, isConnected, isLoading, isFreighterInstalled, connect, disconnect, network }}
    >
      {children}
    </StellarWalletContext.Provider>
  );
};

export const useStellarWallet = () => useContext(StellarWalletContext);
