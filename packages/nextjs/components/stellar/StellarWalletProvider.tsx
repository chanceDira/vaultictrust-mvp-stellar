"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { getWalletKit, syncWalletKitTheme } from "~~/services/stellar/walletKit";

type StellarWalletContextValue = {
  publicKey: string | null;
  isConnected: boolean;
  isLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  network: string | null;
};

const StellarWalletContext = createContext<StellarWalletContextValue>({
  publicKey: null,
  isConnected: false,
  isLoading: false,
  connect: async () => {},
  disconnect: async () => {},
  network: null,
});

function applyAddress(
  address: string | undefined,
  setPublicKey: (value: string | null) => void,
  setIsConnected: (value: boolean) => void,
): void {
  if (!address) {
    setPublicKey(null);
    setIsConnected(false);
    return;
  }

  setPublicKey(address);
  setIsConnected(true);
}

export const StellarWalletProvider = ({ children }: { children: React.ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [network, setNetwork] = useState<string | null>(null);

  useEffect(() => {
    let stopState = () => {};
    let stopDisconnect = () => {};
    let cancelled = false;

    const listen = async () => {
      const kit = await getWalletKit();
      const { KitEventType } = await import("@creit.tech/stellar-wallets-kit/types");
      if (cancelled) return;

      try {
        const { address } = await kit.getAddress();
        applyAddress(address, setPublicKey, setIsConnected);
      } catch {
        applyAddress(undefined, setPublicKey, setIsConnected);
      }

      stopState = kit.on(KitEventType.STATE_UPDATED, event => {
        applyAddress(event.payload.address, setPublicKey, setIsConnected);
        if (event.payload.networkPassphrase) setNetwork(event.payload.networkPassphrase);
      });

      stopDisconnect = kit.on(KitEventType.DISCONNECT, () => {
        applyAddress(undefined, setPublicKey, setIsConnected);
        setNetwork(null);
      });
    };

    listen().catch((error: unknown) => {
      console.error("[Stellar] Wallet kit failed to start:", error);
    });

    return () => {
      cancelled = true;
      stopState();
      stopDisconnect();
    };
  }, []);

  useEffect(() => {
    if (!resolvedTheme) return;
    syncWalletKitTheme(resolvedTheme === "dark").catch((error: unknown) => {
      console.error("[Stellar] Wallet kit theme failed:", error);
    });
  }, [resolvedTheme]);

  const connect = useCallback(async () => {
    setIsLoading(true);
    try {
      const kit = await getWalletKit();
      const { address } = await kit.authModal();
      applyAddress(address, setPublicKey, setIsConnected);
    } catch (error: unknown) {
      const closedByUser =
        typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === -1;
      if (!closedByUser) console.error("[Stellar] Connection failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const kit = await getWalletKit();
      await kit.disconnect();
    } catch (error: unknown) {
      console.error("[Stellar] Disconnect failed:", error);
    } finally {
      applyAddress(undefined, setPublicKey, setIsConnected);
      setNetwork(null);
    }
  }, []);

  return (
    <StellarWalletContext.Provider value={{ publicKey, isConnected, isLoading, connect, disconnect, network }}>
      {children}
    </StellarWalletContext.Provider>
  );
};

export const useStellarWallet = () => useContext(StellarWalletContext);
