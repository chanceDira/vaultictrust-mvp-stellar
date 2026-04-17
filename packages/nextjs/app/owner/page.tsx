"use client";

import { useState } from "react";
import { Keypair } from "@stellar/stellar-sdk";
import {
  BuildingOffice2Icon,
  CheckCircleIcon,
  DocumentTextIcon,
  PlusIcon,
  SparklesIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { issueRWAAsset } from "~~/services/stellar/stellarService";
import { notification } from "~~/utils/scaffold-eth";

const MOCK_APPROVED_ASSETS = [
  {
    id: 1,
    name: "Kigali Green Tower",
    ticker: "VTKGT",
    status: "Approved",
    valuation: "10,000,000",
    shares: "1,000,000",
  },
];

export default function OwnerPage() {
  const { isConnected, publicKey } = useStellarWallet();
  const [isIssuing, setIsIssuing] = useState<number | null>(null);

  const handleIssueToken = async (asset: (typeof MOCK_APPROVED_ASSETS)[0]) => {
    if (!publicKey) return;

    const notificationId = notification.loading(`Issuing native Stellar tokens for ${asset.name}...`);
    setIsIssuing(asset.id);

    try {
      // For MVP/Demo purposes, we generate a random issuer keypair
      // In a real app, this would be an account the user controls or a multi-sig setup
      const issuerKeypair = Keypair.random();

      // Step: Issue RWA tokens to the distribution/vault logic
      // In Stellar production, the issuer sends to the distribution account
      await issueRWAAsset(
        issuerKeypair,
        publicKey, // Sending to the owner's account for now as the 'Distributor'
        asset.ticker,
        asset.shares,
      );

      notification.success(`Successfully issued ${asset.shares} ${asset.ticker} tokens on Stellar!`);
      notification.info(`Issuer Public Key: ${issuerKeypair.publicKey()}`, { duration: 10000 });
    } catch (error: any) {
      console.error(error);
      notification.error(`Issuance failed: ${error.message}`);
    } finally {
      setIsIssuing(null);
      notification.remove(notificationId);
    }
  };

  const shortKey = publicKey ? `${publicKey.slice(0, 6)}…${publicKey.slice(-5)}` : null;

  return (
    <div className="flex flex-col grow">
      <section className="px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BuildingOffice2Icon className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-base-content uppercase tracking-tight">Owner Dashboard</h1>
          </div>
          <p className="text-base-content/80 mb-8">
            Manage your African real-world assets. Tokenize approved assets into Stellar native primitives.
          </p>

          {isConnected ? (
            <div className="space-y-6">
              {/* Wallet Info */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold text-base-content">
                    Account: <span className="font-mono">{shortKey}</span>
                  </p>
                </div>
                <span className="text-xs font-bold text-primary uppercase tracking-widest">Asset Owner</span>
              </div>

              {/* Action: Register New */}
              <div className="rounded-2xl border border-dashed border-primary/30 p-8 text-center hover:bg-primary/5 transition-colors group cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <PlusIcon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-base-content">Tokenize New Asset</h3>
                <p className="text-sm text-base-content/60 mt-1 max-w-xs mx-auto">
                  Submit docs for Kigali Green Tower, Carbon Credits, or other African RWAs.
                </p>
              </div>

              {/* SECTION: Pending Issuance */}
              <div>
                <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 text-primary" />
                  Approved & Ready to Issue
                </h2>
                <div className="grid gap-4">
                  {MOCK_APPROVED_ASSETS.map(asset => (
                    <div key={asset.id} className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                            <BuildingOffice2Icon className="h-6 w-6" />
                          </span>
                          <div>
                            <p className="font-bold text-base-content">{asset.name}</p>
                            <p className="text-xs text-base-content/60 mt-0.5 uppercase font-mono tracking-wider">
                              {asset.ticker} · Valuation: ${asset.valuation}
                            </p>
                            <span className="badge badge-success badge-sm mt-2 font-bold px-3">Approved</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleIssueToken(asset)}
                          disabled={isIssuing === asset.id}
                          className={`btn btn-primary btn-md gap-2 ${isIssuing === asset.id ? "loading" : ""}`}
                        >
                          {isIssuing === asset.id ? "Issuing..." : "Issue Native Tokens"}
                          {!isIssuing && <SparklesIcon className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Help Box */}
              <div className="rounded-2xl bg-base-300/30 p-6 border border-base-300/50">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                    <DocumentTextIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base-content">Stellar Hybrid Issuance</h3>
                    <p className="text-sm text-base-content/60 mt-1">
                      Issuing native tokens creates the fractional share layer on Stellar. Once issued, your asset will
                      be live on the Vaultic Marketplace.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-base-300 bg-base-100 p-8 sm:p-10 text-center shadow-sm">
              <div className="w-14 h-14 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-4">
                <WalletIcon className="h-7 w-7 text-base-content/60" />
              </div>
              <h2 className="text-xl font-bold text-base-content">Connect your Stellar wallet</h2>
              <p className="mt-2 text-base-content/70 max-w-md mx-auto">
                Sign in to manage your asset listings and monitor tokenization status.
              </p>
              <div className="mt-6">
                <StellarConnectButton />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
