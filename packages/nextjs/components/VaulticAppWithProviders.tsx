"use client";

import { useEffect } from "react";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { Toaster } from "react-hot-toast";
import { Footer } from "~~/components/Footer";
import { Header } from "~~/components/Header";
import { GlobalKycBanner } from "~~/components/stellar/GlobalKycBanner";
import { StellarWalletProvider } from "~~/components/stellar/StellarWalletProvider";
import { TransactionProvider, useTransaction } from "~~/components/stellar/TransactionContext";
import { setTxGuard } from "~~/services/stellar/sorobanService";

function TxGuardBridge() {
  const { beginTx, endTx } = useTransaction();

  useEffect(() => {
    setTxGuard({
      begin: () => beginTx("global"),
      end: () => endTx("global"),
    });
  }, [beginTx, endTx]);

  return null;
}

const VaulticApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <div className="flex flex-col min-h-screen premium-gradient transition-colors duration-500">
        <div className="sticky top-0 z-30 pt-2 backdrop-blur-md sm:pt-2.5">
          <GlobalKycBanner />
          <Header />
        </div>
        <main className="relative flex flex-col flex-1">{children}</main>
        <Footer />
      </div>
      <Toaster />
    </>
  );
};

export const VaulticAppWithProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <StellarWalletProvider>
      <TransactionProvider>
        <TxGuardBridge />
        <ProgressBar height="3px" color="#7c3aed" options={{ showSpinner: false }} />
        <VaulticApp>{children}</VaulticApp>
      </TransactionProvider>
    </StellarWalletProvider>
  );
};
