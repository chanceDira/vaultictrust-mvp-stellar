"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  DocumentTextIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";

const STEPS = [
  {
    step: "01",
    title: "Connect Freighter",
    desc: "Install the Freighter browser extension and connect your Stellar wallet.",
  },
  {
    step: "02",
    title: "Submit Asset",
    desc: "Upload your real-world asset documentation — title deeds, valuations, and legal records.",
  },
  {
    step: "03",
    title: "Choose Structure",
    desc: "Decide between whole-asset sale or fractional tokenization via Stellar Asset Contracts (SAC).",
  },
  {
    step: "04",
    title: "Go Live",
    desc: "Once approved, your asset is listed on the Vaultic Trust marketplace for investor access.",
  },
];

export default function OwnerPage() {
  const { isConnected, publicKey } = useStellarWallet();

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
            <h1 className="text-3xl font-bold text-base-content">Owner Dashboard</h1>
          </div>
          <p className="text-base-content/80 mb-8">
            Submit real-world assets with documentation. Choose whole-asset sale or fractional tokenization on Stellar.
          </p>

          {/* Not connected state */}
          {isConnected ? (
            <>
              {/* Connected — show wallet + how to register */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-6 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <CheckCircleIcon className="h-4 w-4 text-primary" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-base-content">
                    Connected: <span className="font-mono">{shortKey}</span>
                  </p>
                  <p className="text-xs text-base-content/60">Stellar Testnet · Freighter</p>
                </div>
              </div>

              {/* Asset registration — Soroban coming soon */}
              <div className="rounded-2xl border border-base-300/80 bg-base-100 p-6 sm:p-8 shadow-sm mb-8">
                <div className="flex items-start gap-3 mb-6">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <DocumentTextIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-base-content">Register an Asset</h2>
                    <p className="text-sm text-base-content/60 mt-0.5">
                      Soroban contract integration — coming in Phase 2.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-6">
                  <p className="text-sm font-semibold text-base-content mb-1">🚀 Phase 2 Incoming</p>
                  <p className="text-xs text-base-content/70">
                    The on-chain asset registration form will be live once Soroban contracts are deployed to Stellar
                    Testnet. Your wallet is connected and ready.
                  </p>
                </div>

                {/* How it will work */}
                <h3 className="text-sm font-semibold text-base-content/70 uppercase tracking-wider mb-4">
                  How it works
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {STEPS.map(({ step, title, desc }) => (
                    <div key={step} className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {step}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-base-content">{title}</p>
                        <p className="text-xs text-base-content/60 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/marketplace" className="btn btn-primary btn-sm gap-1.5">
                    Browse marketplace
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </Link>
                  <Link href="/litepaper" className="btn btn-outline btn-sm">
                    Read the litepaper
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-base-300 bg-base-100 p-8 sm:p-10 text-center shadow-sm">
              <div className="w-14 h-14 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-4">
                <WalletIcon className="h-7 w-7 text-base-content/60" />
              </div>
              <h2 className="text-xl font-bold text-base-content">Connect your Stellar wallet</h2>
              <p className="mt-2 text-base-content/70 max-w-md mx-auto">
                Connect Freighter to access the owner dashboard and register or manage your tokenized assets on Stellar
                Network.
              </p>
              <div className="mt-6">
                <StellarConnectButton />
              </div>
              <p className="mt-5 text-xs text-base-content/50">
                Don&apos;t have Freighter?{" "}
                <a href="https://www.freighter.app/" target="_blank" rel="noreferrer" className="link link-primary">
                  Install it here
                </a>
                .
              </p>
              <p className="mt-4 text-sm text-base-content/60">
                <Link href="/litepaper" className="link link-primary">
                  Read the litepaper
                </Link>
                {" · "}
                <Link href="/marketplace" className="link link-primary">
                  Browse marketplace
                </Link>
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
