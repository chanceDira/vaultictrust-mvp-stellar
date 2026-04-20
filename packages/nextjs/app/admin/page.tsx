"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowPathIcon,
  BanknotesIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  CubeTransparentIcon,
  ExclamationTriangleIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  WalletIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { TokenizeModal } from "~~/components/modals/TokenizeModal";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { shortenStellarAddress } from "~~/services/stellar/horizonClient";
import {
  approveAsset,
  fetchAsset,
  fetchTotalAssets,
  fetchUserRecord,
  getContractIds,
  setUserStatus,
  sweepFees,
} from "~~/services/stellar/sorobanService";
import { AssetStateKey, OnChainAsset, UserTab } from "~~/types/stellar";
import { notification } from "~~/utils/scaffold-eth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATE_CONFIG: Record<AssetStateKey, { label: string; color: string; icon: React.ElementType }> = {
  Pending: { label: "Pending", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", icon: ClockIcon },
  Active: { label: "Active", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircleIcon },
  Tokenized: {
    label: "Tokenized",
    color: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    icon: CubeTransparentIcon,
  },
  Closed: { label: "Closed", color: "text-red-400 bg-red-400/10 border-red-400/20", icon: XCircleIcon },
  Relisted: { label: "Relisted", color: "text-blue-400 bg-blue-400/10 border-blue-400/20", icon: ArrowPathIcon },
};

const KYC_CONFIG: Record<string | number, { label: string; color: string }> = {
  // Legacy integer mapping
  0: { label: "None", color: "text-base-content/40 bg-base-300/20" },
  1: { label: "Pending", color: "text-yellow-400 bg-yellow-400/10" },
  2: { label: "Verified", color: "text-emerald-400 bg-emerald-400/10" },
  3: { label: "Rejected", color: "text-red-400 bg-red-400/10" },
  4: { label: "Suspended", color: "text-orange-400 bg-orange-400/10" },
  // String-based Symbol mapping (Soroban native)
  None: { label: "None", color: "text-base-content/40 bg-base-300/20" },
  Pending: { label: "Pending", color: "text-yellow-400 bg-yellow-400/10" },
  Verified: { label: "Verified", color: "text-emerald-400 bg-emerald-400/10" },
  Rejected: { label: "Rejected", color: "text-red-400 bg-red-400/10" },
  Suspended: { label: "Suspended", color: "text-orange-400 bg-orange-400/10" },
};

// ---------------------------------------------------------------------------
// Asset Row
// ---------------------------------------------------------------------------

function AssetRow({
  asset,
  onApprove,
  onTokenize,
  isApproving,
}: Readonly<{
  asset: OnChainAsset;
  onApprove: (id: number) => void;
  onTokenize: (asset: OnChainAsset) => void;
  isApproving: boolean;
}>) {
  const state = asset.state.tag as AssetStateKey;
  const stateConfig = STATE_CONFIG[state] ?? STATE_CONFIG.Pending;
  const StateIcon = stateConfig.icon;
  const progress =
    asset.total_shares > 0n ? Math.round((Number(asset.sold_shares) / Number(asset.total_shares)) * 100) : 0;

  return (
    <div className="rounded-xl border border-base-300 bg-base-200/30 p-5 hover:border-primary/30 transition-all">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-lg">{asset.asset_name}</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${stateConfig.color}`}
            >
              <StateIcon className="h-3.5 w-3.5" />
              {stateConfig.label}
            </span>
            <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md">
              {asset.asset_code}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1.5 text-xs text-base-content/60">
            <span>
              <span className="font-semibold text-base-content/80">Category:</span> {asset.asset_category}
            </span>
            <span>
              <span className="font-semibold text-base-content/80">ID:</span> #{asset.asset_id}
            </span>
            <span>
              <span className="font-semibold text-base-content/80">Owner:</span>{" "}
              <span className="font-mono">{shortenStellarAddress(asset.asset_owner)}</span>
            </span>
            <span>
              <span className="font-semibold text-base-content/80">Model:</span> {asset.model.tag}
            </span>
          </div>

          {asset.metadata_uri && (
            <a
              href={asset.metadata_uri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/")}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary/70 hover:text-primary mt-1.5 inline-block underline underline-offset-2 break-all"
            >
              {asset.metadata_uri}
            </a>
          )}

          {state === "Tokenized" && asset.total_shares > 0n && (
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-base-content/50 font-semibold uppercase tracking-widest">Round Progress</span>
                <span className="text-primary font-bold">{progress}%</span>
              </div>
              <div className="h-2 w-full bg-base-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-base-content/40 mt-1">
                {asset.sold_shares.toString()} / {asset.total_shares.toString()} shares sold
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          {state === "Pending" && (
            <button
              className="btn btn-success btn-sm gap-1.5"
              onClick={() => onApprove(asset.asset_id)}
              disabled={isApproving}
            >
              {isApproving ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <CheckCircleIcon className="h-4 w-4" />
              )}
              Approve
            </button>
          )}
          {state === "Active" && asset.model.tag === "Fractional" && (
            <button className="btn btn-primary btn-sm gap-1.5" onClick={() => onTokenize(asset)}>
              <CubeTransparentIcon className="h-4 w-4" />
              Tokenize
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Admin Page
// ---------------------------------------------------------------------------

export default function AdminPage() {
  const { isConnected, publicKey } = useStellarWallet();
  const [activeTab, setActiveTab] = useState<UserTab>("assets");
  const [assets, setAssets] = useState<OnChainAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [tokenizeTarget, setTokenizeTarget] = useState<OnChainAsset | null>(null);
  const [isSweeping, setIsSweeping] = useState(false);
  const [filter, setFilter] = useState<AssetStateKey | "All">("All");

  // KYC States
  const [kycSearchAddr, setKycSearchAddr] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [isUpdatingKyc, setIsUpdatingKyc] = useState(false);
  const contracts = getContractIds();
  const isDeployed = !!contracts.registry;

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const total = await fetchTotalAssets();
      const items: OnChainAsset[] = [];
      for (let i = 1; i <= total; i++) {
        const asset = await fetchAsset(i);
        if (asset) items.push(asset);
      }
      setAssets([...items].reverse()); // newest first
    } catch (error: any) {
      console.error("Failed to load assets:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isConnected && isDeployed) {
      loadAssets();
    }
  }, [isConnected, isDeployed, loadAssets]);

  const handleApprove = async (assetId: number) => {
    if (!publicKey) return;
    setApprovingId(assetId);
    const notifId = notification.loading("Approving asset on-chain...");
    try {
      await approveAsset(assetId, publicKey);
      notification.success("Asset approved! Status → Active");
      await loadAssets();
    } catch (err: any) {
      notification.error(`Approval failed: ${err.message || "Unknown error"}`);
    } finally {
      setApprovingId(null);
      notification.remove(notifId);
    }
  };

  const handleSweepFees = async () => {
    if (!publicKey) return;
    setIsSweeping(true);
    const notifId = notification.loading("Sweeping protocol fees to treasury...");
    try {
      await sweepFees(publicKey);
      notification.success("Protocol fees swept to treasury.");
    } catch (err: any) {
      notification.error(`Sweep failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsSweeping(false);
      notification.remove(notifId);
    }
  };

  const handleSearchUser = async () => {
    if (!kycSearchAddr) return;
    setIsSearchingUser(true);
    try {
      const user = await fetchUserRecord(kycSearchAddr);
      if (user && user.address !== "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF") {
        setFoundUser(user);
      } else {
        notification.error("User not found or never registered");
        setFoundUser(null);
      }
    } catch {
      notification.error("Invalid address or RPC error");
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handleUpdateKyc = async (status: number) => {
    if (!publicKey || !foundUser) return;
    setIsUpdatingKyc(true);
    const notifId = notification.loading("Updating KYC status on-chain...");
    try {
      await setUserStatus(foundUser.address, status, publicKey);
      notification.success("KYC Status updated!");
      await handleSearchUser(); // refresh
    } catch (err: any) {
      notification.error(`Update failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsUpdatingKyc(false);
      notification.remove(notifId);
    }
  };

  const filteredAssets = filter === "All" ? assets : assets.filter(a => a.state.tag === filter);

  const counts = {
    Pending: assets.filter(a => a.state.tag === "Pending").length,
    Active: assets.filter(a => a.state.tag === "Active").length,
    Tokenized: assets.filter(a => a.state.tag === "Tokenized").length,
    Closed: assets.filter(a => a.state.tag === "Closed").length,
    Relisted: assets.filter(a => a.state.tag === "Relisted").length,
  };

  return (
    <div className="flex flex-col grow bg-base-200/20 min-h-screen">
      <section className="px-4 py-8 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheckIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-tight">Admin Dashboard</h1>
            <p className="text-xs text-base-content/50 uppercase tracking-widest">
              Vaultic Trust · Compliance &amp; Registry Control
            </p>
          </div>
        </div>
        <p className="text-sm text-base-content/60 mb-6 mt-1">
          Review and approve RWA submissions, manage tokenization, and oversee protocol fees. Restricted to Vaultic team
          wallets.
        </p>

        {/* Not connected */}
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

        {/* Contracts not deployed */}
        {isConnected && !isDeployed && (
          <div className="alert alert-warning mb-6">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">Soroban Contracts Not Deployed</p>
              <p className="text-sm">
                Run{" "}
                <code className="bg-base-300 px-1.5 py-0.5 rounded text-xs">
                  packages/soroban-contracts/deploy-testnet.sh
                </code>{" "}
                to deploy, then update{" "}
                <code className="bg-base-300 px-1.5 py-0.5 rounded text-xs">scaffold.config.ts</code>.
              </p>
            </div>
          </div>
        )}

        {isConnected && isDeployed && (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {(Object.keys(STATE_CONFIG) as AssetStateKey[]).map(state => {
                const cfg = STATE_CONFIG[state];
                const Icon = cfg.icon;
                return (
                  <button
                    key={state}
                    onClick={() => setFilter(filter === state ? "All" : state)}
                    className={`rounded-xl border p-3 text-left transition-all hover:scale-[1.02] ${
                      filter === state ? "ring-2 ring-primary" : "border-base-300 bg-base-100"
                    }`}
                  >
                    <Icon className={`h-5 w-5 mb-1 ${cfg.color.split(" ")[0]}`} />
                    <p className="text-xl font-bold">{counts[state]}</p>
                    <p className="text-xs text-base-content/50 font-semibold uppercase tracking-widest">{state}</p>
                  </button>
                );
              })}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-base-300 mb-6 gap-6">
              <button
                className={`pb-3 text-sm font-bold uppercase tracking-widest transition-all ${
                  activeTab === "assets"
                    ? "border-b-2 border-primary text-primary"
                    : "text-base-content/40 hover:text-base-content/60"
                }`}
                onClick={() => setActiveTab("assets")}
              >
                Asset Management
              </button>
              <button
                className={`pb-3 text-sm font-bold uppercase tracking-widest transition-all ${
                  activeTab === "compliance"
                    ? "border-b-2 border-primary text-primary"
                    : "text-base-content/40 hover:text-base-content/60"
                }`}
                onClick={() => setActiveTab("compliance")}
              >
                Compliance &amp; Users
              </button>
            </div>

            {activeTab === "assets" ? (
              <>
                {/* Actions Row */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <button className="btn btn-outline btn-sm gap-2" onClick={loadAssets} disabled={isLoading}>
                    <ArrowPathIcon className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>

                  <button className="btn btn-warning btn-sm gap-2" onClick={handleSweepFees} disabled={isSweeping}>
                    {isSweeping ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <BanknotesIcon className="h-4 w-4" />
                    )}
                    Sweep Protocol Fees
                  </button>

                  <div className="ml-auto">
                    <span className="text-xs text-base-content/40 font-mono">
                      Registry:{" "}
                      <span className="text-primary">
                        {contracts.registry ? shortenStellarAddress(contracts.registry, 6) : "–"}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Filter label */}
                {filter !== "All" && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-base-content/60">Showing:</span>
                    <span className={`text-sm font-bold ${STATE_CONFIG[filter].color.split(" ")[0]}`}>{filter}</span>
                    <button
                      className="text-xs underline text-base-content/40 hover:text-primary"
                      onClick={() => setFilter("All")}
                    >
                      Clear
                    </button>
                  </div>
                )}

                {/* Asset List */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <span className="loading loading-dots loading-lg text-primary" />
                  </div>
                ) : filteredAssets.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-base-300 p-10 text-center">
                    <ChartBarIcon className="h-10 w-10 text-base-content/20 mx-auto mb-3" />
                    <p className="font-bold text-base-content/50">
                      {filter === "All" ? "No assets registered yet." : `No ${filter} assets.`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAssets.map(asset => (
                      <AssetRow
                        key={asset.asset_id}
                        asset={asset}
                        onApprove={handleApprove}
                        onTokenize={setTokenizeTarget}
                        isApproving={approvingId === asset.asset_id}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-6">
                {/* KYC Management */}
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <IdentificationIcon className="h-6 w-6 text-primary" />
                    <h2 className="text-xl font-bold">User KYC Management</h2>
                  </div>
                  <p className="text-sm text-base-content/60 mb-6">
                    Search for a user by their Stellar public key to review or update their compliance status.
                  </p>

                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Enter user address (G...)"
                      className="input input-bordered grow font-mono text-sm"
                      value={kycSearchAddr}
                      onChange={e => setKycSearchAddr(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={handleSearchUser} disabled={isSearchingUser}>
                      {isSearchingUser ? <span className="loading loading-spinner loading-xs" /> : "Lookup"}
                    </button>
                  </div>

                  {foundUser && (
                    <div className="mt-8 p-6 rounded-xl bg-base-200/50 border border-base-300 animate-in fade-in slide-in-from-top-2">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-base-content/40 mb-1">
                            User Address
                          </p>
                          <p className="font-mono text-sm break-all">{foundUser.address}</p>

                          <div className="mt-4 flex items-center gap-4">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-base-content/40 mb-1">
                                Current Status
                              </p>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                  KYC_CONFIG[foundUser.status]?.color ||
                                  (typeof foundUser.status === "object" && foundUser.status.tag
                                    ? KYC_CONFIG[foundUser.status.tag]?.color
                                    : "text-base-content/40")
                                }`}
                              >
                                {KYC_CONFIG[foundUser.status]?.label ||
                                  (typeof foundUser.status === "object" && foundUser.status.tag
                                    ? foundUser.status.tag
                                    : "Unknown")}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-base-content/40 mb-1">
                                Last Updated
                              </p>
                              <p className="text-sm">
                                {new Date(Number(foundUser.updated_at) * 1000).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          {foundUser.metadata_uri && (
                            <div className="mt-4">
                              <p className="text-xs font-bold uppercase tracking-widest text-base-content/40 mb-1">
                                Identity Metadata (IPFS)
                              </p>
                              <a
                                href={foundUser.metadata_uri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/")}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary underline break-all"
                              >
                                {foundUser.metadata_uri}
                              </a>
                            </div>
                          )}

                          {foundUser.commitment && (
                            <div className="mt-4 bg-base-300/30 rounded-lg p-3 border border-base-300">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-base-content/40 mb-1">
                                ZK-Commitment Hash (SHA-256)
                              </p>
                              <code className="text-[10px] break-all opacity-70 font-mono">
                                {Buffer.from(foundUser.commitment).toString("hex")}
                              </code>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 shrink-0 sm:w-48">
                          <button
                            className="btn btn-success btn-sm w-full"
                            onClick={() => handleUpdateKyc(2)}
                            disabled={
                              isUpdatingKyc ||
                              foundUser.status === 2 ||
                              foundUser.status === "Verified" ||
                              foundUser.status?.tag === "Verified"
                            }
                          >
                            Verify User
                          </button>
                          <button
                            className="btn btn-warning btn-sm w-full"
                            onClick={() => handleUpdateKyc(4)}
                            disabled={
                              isUpdatingKyc ||
                              foundUser.status === 4 ||
                              foundUser.status === "Suspended" ||
                              foundUser.status?.tag === "Suspended"
                            }
                          >
                            Suspend User
                          </button>
                          <button
                            className="btn btn-error btn-outline btn-sm w-full"
                            onClick={() => handleUpdateKyc(3)}
                            disabled={
                              isUpdatingKyc ||
                              foundUser.status === 3 ||
                              foundUser.status === "Rejected" ||
                              foundUser.status?.tag === "Rejected"
                            }
                          >
                            Reject KYC
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Info Card */}
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-6">
                  <div className="flex gap-4">
                    <UserGroupIcon className="h-6 w-6 text-primary shrink-0" />
                    <div>
                      <h3 className="font-bold text-primary mb-1">Hybrid KYC Architecture</h3>
                      <p className="text-sm text-base-content/70">
                        This system uses an on-chain registry to store compliance flags. Privacy is maintained by
                        keeping PII off-chain, while the Soroban contracts can atomically enforce investment gating
                        using these flags.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Tokenize Modal */}
      {tokenizeTarget && publicKey && (
        <TokenizeModal
          asset={tokenizeTarget}
          publicKey={publicKey}
          onClose={() => setTokenizeTarget(null)}
          onSuccess={async () => {
            setTokenizeTarget(null);
            await loadAssets();
          }}
        />
      )}
    </div>
  );
}
