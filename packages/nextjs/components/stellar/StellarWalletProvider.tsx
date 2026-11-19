"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { getWalletKit, syncWalletKitTheme } from "~~/services/stellar/walletKit";
import { connectWallet, dropOrphanedSession, syncWalletAccount } from "~~/services/stellar/walletSession";
import { notification } from "~~/utils/vaultic/notification";
import { connectFailureMessage } from "~~/utils/vaultic/walletErrors";

type StellarWalletContextValue = {
  publicKey: string | null;
  isConnected: boolean;
  isLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

const StellarWalletContext = createContext<StellarWalletContextValue>({
  publicKey: null,
  isConnected: false,
  isLoading: false,
  connect: async () => {},
  disconnect: async () => {},
});

export const StellarWalletProvider = ({ children }: { children: React.ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const stops: Array<() => void> = [];

    const listen = async (): Promise<void> => {
      await dropOrphanedSession();
      const kit = await getWalletKit();
      const { KitEventType } = await import("@creit.tech/stellar-wallets-kit/types");
      if (cancelled) return;

      stops.push(kit.on(KitEventType.STATE_UPDATED, event => setPublicKey(event.payload.address ?? null)));
      stops.push(kit.on(KitEventType.DISCONNECT, () => setPublicKey(null)));
    };

    listen().catch((error: unknown) => {
      console.error("[Stellar] Wallet kit failed to start:", error);
    });

    return () => {
      cancelled = true;
      stops.forEach(stop => stop());
    };
  }, []);

  useEffect(() => {
    if (!publicKey) return;

    const checkAccount = (): void => {
      if (document.visibilityState !== "visible") return;
      syncWalletAccount().catch(() => undefined);
    };

    window.addEventListener("focus", checkAccount);
    document.addEventListener("visibilitychange", checkAccount);
    return () => {
      window.removeEventListener("focus", checkAccount);
      document.removeEventListener("visibilitychange", checkAccount);
    };
  }, [publicKey]);

  useEffect(() => {
    if (!resolvedTheme) return;
    syncWalletKitTheme(resolvedTheme === "dark").catch((error: unknown) => {
      console.error("[Stellar] Wallet kit theme failed:", error);
    });
  }, [resolvedTheme]);

  const connect = useCallback(async () => {
    setIsLoading(true);
    try {
      setPublicKey(await connectWallet());
    } catch (error: unknown) {
      const message = connectFailureMessage(error);
      if (message) notification.error(message);
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
      setPublicKey(null);
    }
  }, []);

  return (
    <StellarWalletContext.Provider
      value={{ publicKey, isConnected: publicKey !== null, isLoading, connect, disconnect }}
    >
      {children}
    </StellarWalletContext.Provider>
  );
};

export const useStellarWallet = () => useContext(StellarWalletContext);
