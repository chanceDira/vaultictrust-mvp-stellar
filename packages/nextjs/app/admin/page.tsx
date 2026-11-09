"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminAssetsTab } from "./components/AdminAssetsTab";
import { AdminComplianceTab } from "./components/AdminComplianceTab";
import { AdminGovernanceTab } from "./components/AdminGovernanceTab";
import { AdminStatsPanel } from "./components/AdminStatsPanel";
import { ExclamationTriangleIcon, WalletIcon } from "@heroicons/react/24/outline";
import { RpcErrorBoundary } from "~~/components/RpcErrorBoundary";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { ADMIN_ADDRESSES } from "~~/scaffold.config";
import { getContractIds } from "~~/services/stellar/sorobanService";
import { UserTab } from "~~/types/stellar";

const TABS: { key: UserTab; label: string }[] = [
  { key: "assets", label: "Asset Management" },
  { key: "compliance", label: "Compliance & Users" },
  { key: "governance", label: "Governance" },
];

function NotAuthorized() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-base-200/30 rounded-3xl border border-dashed border-base-content/10 mx-4">
      <div className="w-20 h-20 bg-error/10 text-error rounded-full flex items-center justify-center mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-10 w-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m0 0v2m0-2h2m-2 0H10m-3-3h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
      <p className="text-base-content/60 max-w-md mb-8">
        This portal is restricted to authorized administrators. Your current wallet address does not have the required
        permissions.
      </p>
      <Link href="/" className="btn btn-primary rounded-full px-8 shadow-lg shadow-primary/20">
        Return to Home
      </Link>
    </div>
  );
}

export default function AdminPage() {
  const { isConnected, publicKey } = useStellarWallet();
  const [activeTab, setActiveTab] = useState<UserTab>("assets");

  const isAdmin = publicKey && ADMIN_ADDRESSES.includes(publicKey);
  const contracts = getContractIds();
  const isDeployed = !!contracts.registry;

  if (isConnected && !isAdmin) return <NotAuthorized />;

  return (
    <div className="flex flex-col grow min-h-screen">
      <section className="mx-auto w-full max-w-6xl px-3 py-8 sm:px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Admin dashboard</h1>
          <p className="text-sm text-base-content/50">Compliance and registry control</p>
          <p className="text-sm text-base-content/60 mt-1">
            Review and approve RWA submissions, manage tokenization, and oversee protocol fees. Restricted to Vaultic
            team wallets.
          </p>
        </div>

        {!isConnected && (
          <div className="rounded-2xl border border-dashed border-base-300 p-8 text-center bg-base-100 mb-6">
            <WalletIcon className="h-12 w-12 text-base-content/20 mx-auto mb-3" />
            <p className="font-bold mb-1">Connect your Admin Wallet</p>
            <p className="text-sm text-base-content/60 mb-5">
              Only Vaultic team wallets can access administrative functions.
            </p>
            <StellarConnectButton />
          </div>
        )}

        {isConnected && !isDeployed && (
          <div className="alert alert-warning mb-6">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">Soroban Contracts Not Deployed</p>
              <p className="text-sm">
                Run{" "}
                <code className="bg-base-300 px-1.5 py-0.5 rounded text-xs">packages/soroban-contracts/deploy.sh</code>{" "}
                to deploy, then update{" "}
                <code className="bg-base-300 px-1.5 py-0.5 rounded text-xs">scaffold.config.ts</code>.
              </p>
            </div>
          </div>
        )}

        {isConnected && isDeployed && publicKey && (
          <>
            <AdminStatsPanel isDeployed={isDeployed} />

            <div className="flex border-b border-base-300 mb-6 gap-6">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  className={`pb-3 text-sm font-bold uppercase tracking-widest transition-all ${
                    activeTab === tab.key
                      ? "border-b-2 border-primary text-primary"
                      : "text-base-content/40 hover:text-base-content/60"
                  }`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <RpcErrorBoundary label="assets panel">
              {activeTab === "assets" && <AdminAssetsTab publicKey={publicKey} />}
            </RpcErrorBoundary>
            <RpcErrorBoundary label="compliance panel">
              {activeTab === "compliance" && <AdminComplianceTab publicKey={publicKey} />}
            </RpcErrorBoundary>
            <RpcErrorBoundary label="governance panel">
              {activeTab === "governance" && <AdminGovernanceTab publicKey={publicKey} />}
            </RpcErrorBoundary>
          </>
        )}
      </section>
    </div>
  );
}
