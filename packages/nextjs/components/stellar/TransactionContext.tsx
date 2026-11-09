"use client";

import React, { createContext, useCallback, useContext, useRef } from "react";

type TransactionContextValue = {
  beginTx: (operationId: string) => boolean;
  endTx: (operationId: string) => void;
  isTxPending: (operationId: string) => boolean;
};

const TransactionContext = createContext<TransactionContextValue>({
  beginTx: () => false,
  endTx: () => {},
  isTxPending: () => false,
});

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const pendingOps = useRef<Set<string>>(new Set());

  const beginTx = useCallback((operationId: string): boolean => {
    if (pendingOps.current.has(operationId)) return false;
    pendingOps.current.add(operationId);
    return true;
  }, []);

  const endTx = useCallback((operationId: string): void => {
    pendingOps.current.delete(operationId);
  }, []);

  const isTxPending = useCallback((operationId: string): boolean => {
    return pendingOps.current.has(operationId);
  }, []);

  return (
    <TransactionContext.Provider value={{ beginTx, endTx, isTxPending }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransaction() {
  return useContext(TransactionContext);
}
