"use client";

import Link from "next/link";
import { Spinner } from "../../components/Spinner";
import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  ChartBarIcon,
  CubeIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { useStellarHoldings } from "~~/hooks/stellar/useStellarHoldings";

export default function InvestorPage() {
  const { isConnected, publicKey } = useStellarWallet();
  const { holdings, isLoading } = useStellarHoldings(publicKey);

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
            <h1 className="text-3xl font-bold text-base-content uppercase tracking-tight">Portfolio</h1>
          </div>
          <p className="text-base-content/80 mb-8">
            Manage your tokenized real-world asset positions on Stellar Network. Real-time tracking of fractional shares
            and asset valuations.
          </p>

          {/* Not connected */}
          {!isConnected ? (
            <div className="rounded-2xl border border-base-300 bg-base-100 p-8 sm:p-10 text-center shadow-sm">
              <div className="w-14 h-14 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-4">
                <WalletIcon className="h-7 w-7 text-base-content/60" />
              </div>
              <h2 className="text-xl font-bold text-base-content">Connect your Stellar wallet</h2>
              <p className="mt-2 text-base-content/70 max-w-md mx-auto">
                Connect Freighter to view your on-chain RWA positions. Your personal dashboard for African asset
                liquidity.
              </p>
              <div className="mt-6">
                <StellarConnectButton />
              </div>
            </div>
          ) : (
            <>
              {/* Connected address pill */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 mb-6 flex items-center gap-2.5">
                <span className="inline-block h-2 w-2 rounded-full bg-success shadow-[0_0_6px] shadow-success" />
                <p className="text-sm font-semibold text-base-content font-mono">{shortKey}</p>
                <span className="ml-auto text-xs text-base-content/50">Stellar Testnet · Freighter</span>
              </div>

              {/* Holdings Section */}
              <h2 className="text-xl font-bold text-base-content mb-4 flex items-center gap-2">
                Your Positions
                {isLoading && <Spinner className="h-4 w-4 text-primary" />}
              </h2>

              {holdings.length === 0 && !isLoading ? (
                <div className="rounded-xl border border-dashed border-base-300 p-12 text-center">
                  <CubeIcon className="h-10 w-10 text-base-content/20 mx-auto mb-3" />
                  <p className="text-base-content/60 text-sm">No tokenized assets found in this wallet.</p>
                  <Link href="/marketplace" className="btn btn-outline btn-sm mt-4 gap-2">
                    Visit Marketplace
                    <ArrowRightIcon className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 mb-10">
                  {holdings.map(holding => (
                    <div
                      key={holding.asset_code}
                      className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                            <CubeIcon className="h-6 w-6" />
                          </span>
                          <div>
                            <p className="font-bold text-base-content">{holding.asset_code}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-[10px] text-base-content/40 font-mono truncate max-w-[120px]">
                                Issuer: {holding.asset_issuer}
                              </p>
                              <a
                                href={`https://stellar.expert/explorer/testnet/asset/${holding.asset_code}-${holding.asset_issuer}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary-focus p-0.5"
                                title="View on Stellar.Expert"
                              >
                                <ArrowTopRightOnSquareIcon className="h-2.5 w-2.5" />
                              </a>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-base-content">
                            {Number.parseFloat(holding.balance).toLocaleString()} shares
                          </p>
                          <p className="text-xs text-primary/80 font-medium">Native Stellar Asset</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Portfolio Insights */}
              <div className="rounded-2xl bg-base-300/30 p-6 flex flex-col md:flex-row items-center justify-between gap-6 border border-base-300/50">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                    <ChartBarIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base-content">Asset Liquidity</h3>
                    <p className="text-sm text-base-content/60">
                      Your holdings are tradable on Stellar&apos;s Decentralized Exchange (DEX).
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 shrink-0">
                  <Link href="/marketplace" className="btn btn-primary gap-2">
                    Expand Portfolio
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
