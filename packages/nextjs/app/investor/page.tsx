"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  ChartBarIcon,
  CubeIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";

const MOCK_HOLDINGS = [
  { ticker: "VT-KGT", name: "Kigali Green Tower", shares: "2,500", value: "RWF 3,125,000", progress: 65 },
  { ticker: "VT-RCC", name: "Rwanda Carbon Credits", shares: "800", value: "RWF 480,000", progress: 42 },
];

export default function InvestorPage() {
  const { isConnected, publicKey } = useStellarWallet();

  const shortKey = publicKey ? `${publicKey.slice(0, 6)}…${publicKey.slice(-5)}` : null;

  return (
    <div className="flex flex-col grow">
      <section className="px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ChartBarIcon className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-base-content">Investor Portfolio</h1>
          </div>
          <p className="text-base-content/80 mb-8">
            View your whole-asset and fractional token holdings on Stellar Network. Funding progress is tracked
            on-chain via Soroban.
          </p>

          {/* Not connected */}
          {!isConnected ? (
            <div className="rounded-2xl border border-base-300 bg-base-100 p-8 sm:p-10 text-center shadow-sm">
              <div className="w-14 h-14 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-4">
                <WalletIcon className="h-7 w-7 text-base-content/60" />
              </div>
              <h2 className="text-xl font-bold text-base-content">Connect your Stellar wallet</h2>
              <p className="mt-2 text-base-content/70 max-w-md mx-auto">
                Connect Freighter to view your tokenized asset positions on Stellar Network and track funding progress.
              </p>
              <div className="mt-6">
                <StellarConnectButton />
              </div>
              <p className="mt-6 text-sm text-base-content/60">
                <Link href="/marketplace" className="link link-primary">
                  Browse the marketplace
                </Link>{" "}
                to invest in assets.
              </p>
            </div>
          ) : (
            <>
              {/* Connected address pill */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 mb-6 flex items-center gap-2.5">
                <span className="inline-block h-2 w-2 rounded-full bg-success shadow-[0_0_6px] shadow-success" />
                <p className="text-sm font-semibold text-base-content font-mono">{shortKey}</p>
                <span className="ml-auto text-xs text-base-content/50">Stellar Testnet · Freighter</span>
              </div>

              {/* Soroban Phase 2 notice */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-6 flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <svg className="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-base-content">Live portfolio tracking — Phase 2</p>
                  <p className="text-xs text-base-content/70 mt-0.5">
                    Once Soroban contracts are live, your actual Stellar trustline balances will appear here. The
                    preview below shows illustrative holdings.
                  </p>
                </div>
              </div>

              {/* Preview holdings */}
              <h2 className="text-xl font-bold text-base-content mb-4">Your positions (preview)</h2>
              <div className="space-y-4 mb-6">
                {MOCK_HOLDINGS.map(holding => (
                  <div
                    key={holding.ticker}
                    className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0">
                          <CubeIcon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="font-semibold text-base-content text-sm">{holding.name}</p>
                          <p className="text-xs text-primary/80 font-mono mt-0.5">{holding.ticker}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-base-content">{holding.shares} shares</p>
                        <p className="text-xs text-base-content/60">{holding.value}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs text-base-content/50">
                        <span>Asset funding progress</span>
                        <span>{holding.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-base-300/80 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-500"
                          style={{ width: `${holding.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/marketplace" className="btn btn-primary gap-2">
                  Browse marketplace
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
                <Link href="/litepaper" className="btn btn-outline">
                  Read the litepaper
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
