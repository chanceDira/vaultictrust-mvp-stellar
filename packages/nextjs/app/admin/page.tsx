"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminAssetsTab } from "./components/AdminAssetsTab";
import { AdminComplianceTab } from "./components/AdminComplianceTab";
import { AdminGovernanceTab } from "./components/AdminGovernanceTab";
import { AdminStatsPanel } from "./components/AdminStatsPanel";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { RpcErrorBoundary } from "~~/components/RpcErrorBoundary";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { ConnectWalletPrompt } from "~~/components/ui/ConnectWalletPrompt";
import { getContractIds } from "~~/services/stellar/sorobanService";
import { UserTab } from "~~/types/stellar";
import { adminAddresses } from "~~/utils/vaultic/adminAddresses";

const TABS: { key: UserTab; label: string }[] = [
  { key: "assets", label: "Assets" },
  { key: "compliance", label: "Compliance" },
  { key: "governance", label: "Governance" },
];

function NotAuthorized() {
  return (
    <div className="mx-auto my-12 w-full max-w-lg rounded-2xl border border-dashed border-base-300 bg-base-100 p-8 text-center shadow-sm sm:p-10">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-error/10 text-error">
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
      <h1 className="page-title mb-2">Access denied</h1>
      <p className="mx-auto mb-8 max-w-md text-sm font-medium text-base-content/70">
        This page is limited to VTrust Africa admin wallets. The wallet you connected does not have that role.
      </p>
      <Link href="/" className="btn btn-primary btn-sm rounded-xl px-6">
        Back to home
      </Link>
    </div>
  );
}

export default function AdminPage() {
  const { isConnected, publicKey } = useStellarWallet();
  const [activeTab, setActiveTab] = useState<UserTab>("assets");

  const isAdmin = publicKey && adminAddresses().includes(publicKey);
  const contracts = getContractIds();
  const isDeployed = !!contracts.registry;

  if (isConnected && !isAdmin) return <NotAuthorized />;

  return (
    <div className="flex flex-col grow min-h-screen">
      <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="mb-10 text-center md:text-left">
          <h1 className="page-title">Admin dashboard</h1>
          <p className="page-subtitle mx-auto mt-2 max-w-2xl md:mx-0">
            Review submissions, turn approved assets into shares, and collect fees. Only VTrust Africa wallets can open
            this page.
          </p>
        </div>

        {!isConnected && (
          <ConnectWalletPrompt
            title="Connect your wallet"
            description="Only VTrust Africa admin wallets can use these controls."
          />
        )}

        {isConnected && !isDeployed && (
          <div className="alert alert-warning mb-6">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Contracts are not deployed</p>
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

            <div className="mb-6 flex gap-4 overflow-x-auto border-b border-base-300 pb-px sm:gap-6">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  className={`shrink-0 whitespace-nowrap border-b-2 pb-3 text-sm font-semibold transition-colors ${
                    activeTab === tab.key
                      ? "border-primary text-base-content"
                      : "border-transparent text-base-content/55 hover:text-base-content"
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
