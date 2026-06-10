"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
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
import { VaulticLoader } from "~~/components/VaulticLoader";
import { TokenizeModal } from "~~/components/modals/TokenizeModal";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { ADMIN_ADDRESSES, getExplorerTxUrl } from "~~/scaffold.config";
import { decryptFileAsAdmin } from "~~/services/stellar/cryptoService";
import { shortenStellarAddress } from "~~/services/stellar/horizonClient";
import {
  approveAsset,
  fetchAdmins,
  fetchAllUserAddresses,
  fetchAsset,
  fetchKycSubmissions,
  fetchTotalAssets,
  fetchTotalFees,
  fetchTotalUsers,
  fetchUserRecord,
  getContractIds,
  setAdmins,
  setUserStatus,
  sweepFees,
} from "~~/services/stellar/sorobanService";
import { AssetStateKey, OnChainAsset, UserTab } from "~~/types/stellar";
import { notification } from "~~/utils/vaultic";

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
  None: { label: "None", color: "text-base-content/40 bg-base-300/20" },
  Pending: { label: "Pending", color: "text-yellow-400 bg-yellow-400/10" },
  Verified: { label: "Verified", color: "text-emerald-400 bg-emerald-400/10" },
  Rejected: { label: "Rejected", color: "text-red-400 bg-red-400/10" },
  Suspended: { label: "Suspended", color: "text-orange-400 bg-orange-400/10" },
};

function AssetRow({
  asset,
  onApprove,
  onTokenize,
  isApproving,
}: Readonly<{
  asset: OnChainAsset;
  onApprove: (e: React.MouseEvent, id: number) => void;
  onTokenize: (asset: OnChainAsset) => void;
  isApproving: boolean;
}>) {
  const state = asset.state.tag as AssetStateKey;
  const stateConfig = STATE_CONFIG[state] ?? STATE_CONFIG.Pending;
  const StateIcon = stateConfig.icon;
  const progress =
    asset.total_shares > 0n ? Math.round((Number(asset.sold_shares) / Number(asset.total_shares)) * 100) : 0;

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100/50 backdrop-blur-sm p-5 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5">
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
              onClick={e => onApprove(e, asset.asset_id)}
              disabled={isApproving}
            >
              {isApproving ? (
                <span className="loading loading-bars loading-xs" />
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

  const [assets, setAssets] = useState<OnChainAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [kycApplications, setKycApplications] = useState<string[]>([]);
  const [isLoadingKycApps, setIsLoadingKycApps] = useState(false);
  const [approvingId] = useState<number | null>(null);
  const [tokenizeTarget, setTokenizeTarget] = useState<OnChainAsset | null>(null);
  const [filter, setFilter] = useState<AssetStateKey | "All">("All");
  const [platformFees, setPlatformFees] = useState<bigint>(0n);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalPlatformAssets, setTotalPlatformAssets] = useState<number>(0);

  const [kycSearchAddr, setKycSearchAddr] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [isUpdatingKyc, setIsUpdatingKyc] = useState(false);
  const lockUpdatingKyc = useRef(false);
  const [decryptedFileUrl, setDecryptedFileUrl] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [adminOrgKey, setAdminOrgKey] = useState("");
  const [kycApplicantMeta, setKycApplicantMeta] = useState<{
    fullName?: string;
    country?: string;
    submittedAt?: string;
  } | null>(null);
  const [onChainAdmins, setOnChainAdmins] = useState<string[]>([]);
  const [newAdminAddr, setNewAdminAddr] = useState("");
  const [isUpdatingAdmins, setIsUpdatingAdmins] = useState(false);

  const [isApprovingAsset, setIsApprovingAsset] = useState(false);
  const lockApprovingAsset = useRef(false);
  const [isSweeping, setIsSweeping] = useState(false);
  const lockSweeping = useRef(false);

  const contracts = getContractIds();
  const isDeployed = !!contracts.registry;

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const total = await fetchTotalAssets();
      const indices = Array.from({ length: total }, (_, i) => i + 1);

      const results = await Promise.all(
        indices.map(async i => {
          const asset = await fetchAsset(i);
          return asset;
        }),
      );

      const items = results.filter((asset): asset is OnChainAsset => asset !== null);
      setAssets(items.reverse());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadKycSubmissions = useCallback(async () => {
    setIsLoadingKycApps(true);
    try {
      const registryApps = await fetchAllUserAddresses();
      const eventApps = await fetchKycSubmissions();

      const merged = Array.from(new Set([...eventApps, ...registryApps]));
      setKycApplications(merged);
    } catch (error) {
      console.error("Failed to load KYC submissions:", error);
    } finally {
      setIsLoadingKycApps(false);
    }
  }, []);

  const loadPlatformStats = useCallback(async () => {
    if (!isDeployed) return;
    setIsLoading(true);
    try {
      const [fees, users, assetsCount, admins] = await Promise.all([
        fetchTotalFees(),
        fetchTotalUsers(),
        fetchTotalAssets(),
        fetchAdmins(),
      ]);
      setPlatformFees(fees);
      setTotalUsers(users);
      setTotalPlatformAssets(assetsCount);
      setOnChainAdmins(admins);
    } catch (error) {
      console.error("Failed to load platform stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isDeployed]);

  useEffect(() => {
    if (isConnected && isDeployed) {
      loadAssets();
      loadKycSubmissions();
      loadPlatformStats();
    }
  }, [isConnected, isDeployed, loadAssets, loadKycSubmissions, loadPlatformStats]);

  if (isConnected && !isAdmin) {
    return <NotAuthorized />;
  }

  const handleApprove = async (e: React.MouseEvent, assetId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!publicKey || isApprovingAsset || lockApprovingAsset.current) return;
    lockApprovingAsset.current = true;
    setIsApprovingAsset(true);
    const notifId = notification.loading("Approving asset on-chain...");
    try {
      const { hash } = await approveAsset(assetId, publicKey);
      notification.success(
        <div className="flex flex-col gap-1">
          <p className="font-bold">Asset approved! Status → Active</p>
          <a
            href={getExplorerTxUrl(hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-primary hover:underline flex items-center gap-1"
          >
            Verify on Explorer <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </a>
        </div>,
      );
      await loadAssets();
    } catch (err: any) {
      notification.error(`Approval failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsApprovingAsset(false);
      lockApprovingAsset.current = false;
      notification.remove(notifId);
    }
  };

  const handleSweepFees = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!publicKey || isSweeping || lockSweeping.current) return;
    lockSweeping.current = true;
    setIsSweeping(true);
    const notifId = notification.loading("Sweeping protocol fees to treasury...");
    try {
      const { hash } = await sweepFees(publicKey);
      notification.success(
        <div className="flex flex-col gap-1">
          <p className="font-bold">Protocol fees swept to treasury</p>
          <a
            href={getExplorerTxUrl(hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-primary hover:underline flex items-center gap-1"
          >
            Verify on Explorer <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </a>
        </div>,
      );
    } catch (err: any) {
      notification.error(`Sweep failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsSweeping(false);
      lockSweeping.current = false;
      notification.remove(notifId);
    }
  };

  const handleAddAdmin = async () => {
    if (!publicKey || !newAdminAddr) return;
    setIsUpdatingAdmins(true);
    const notifId = notification.loading("Authorizing new admin...");
    try {
      await setAdmins([...onChainAdmins, newAdminAddr], publicKey);
      notification.success("Admin added successfully!");
      await loadPlatformStats();
      setNewAdminAddr("");
    } catch (err: any) {
      notification.error(`Failed: ${err.message}`);
    } finally {
      setIsUpdatingAdmins(false);
      notification.remove(notifId);
    }
  };

  const handleRemoveAdmin = async (e: React.MouseEvent, addr: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!publicKey) return;
    setIsUpdatingAdmins(true);
    const notifId = notification.loading("Revoking admin...");
    try {
      await setAdmins(
        onChainAdmins.filter(a => a !== addr),
        publicKey,
      );
      notification.success("Admin revoked!");
      await loadPlatformStats();
    } catch (err: any) {
      notification.error(`Failed: ${err.message}`);
    } finally {
      setIsUpdatingAdmins(false);
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

  const handleUpdateKyc = async (e: React.MouseEvent, status: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!publicKey || !foundUser || isUpdatingKyc || lockUpdatingKyc.current) return;
    lockUpdatingKyc.current = true;
    setIsUpdatingKyc(true);
    const notifId = notification.loading("Updating KYC status on-chain...");
    try {
      const { hash } = await setUserStatus(foundUser.address, status, publicKey);
      notification.success(
        <div className="flex flex-col gap-1">
          <p className="font-bold">KYC Status updated!</p>
          <a
            href={getExplorerTxUrl(hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-primary hover:underline flex items-center gap-1"
          >
            Verify on Explorer <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </a>
        </div>,
      );
      await handleSearchUser();
    } catch (err: any) {
      notification.error(`Update failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsUpdatingKyc(false);
      lockUpdatingKyc.current = false;
      notification.remove(notifId);
    }
  };

  const handleDecryptIdentity = async () => {
    if (!foundUser || !foundUser.metadata_uri || !adminOrgKey) {
      notification.error("Metadata URI and Admin Org Key are required.");
      return;
    }
    setIsDecrypting(true);
    const notifId = notification.loading("Decrypting document via Vaultic Org Key...");
    try {
      const cid = foundUser.metadata_uri;
      const cidClean = cid.replace("ipfs://", "");
      const gatewayUrl = `https://ipfs.io/ipfs/${cidClean}`;
      const response = await fetch(gatewayUrl);
      if (!response.ok) throw new Error(`Gateway returned ${response.status}`);
      const ipfsPayload: any = await response.json();

      const encryptedData = ipfsPayload?.encryptedDocument ?? ipfsPayload;
      if (ipfsPayload?.applicant) {
        setKycApplicantMeta(ipfsPayload.applicant);
      }

      const decryptedBuffer = await decryptFileAsAdmin(encryptedData, adminOrgKey);
      const blob = new Blob([decryptedBuffer], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      setDecryptedFileUrl(url);
      notification.success("Document decrypted successfully!");
    } catch (err: any) {
      notification.error(`Decryption failed: ${err.message || "Invalid Org Key"}`);
    } finally {
      setIsDecrypting(false);
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
    <div className="flex flex-col grow min-h-screen">
      <section className="mx-auto w-full max-w-6xl px-3 py-8 sm:px-4">
        <div className="flex items-center gap-3 mb-2">
          <div>
            <h1 className="text-2xl font-semibold">Admin dashboard</h1>
            <p className="text-sm text-base-content/50">Compliance and registry control</p>
          </div>
        </div>
        <p className="text-sm text-base-content/60 mb-6 mt-1">
          Review and approve RWA submissions, manage tokenization, and oversee protocol fees. Restricted to Vaultic team
          wallets.
        </p>

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

        {isConnected && isDeployed && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="stats shadow-2xl bg-base-100 border border-base-300">
                <div className="stat">
                  <div className="stat-figure text-primary">
                    <UserGroupIcon className="w-8 h-8" />
                  </div>
                  <div className="stat-title uppercase tracking-widest text-[10px] font-bold">Total Platform Users</div>
                  <div className="stat-value text-primary">{totalUsers}</div>
                  <div className="stat-desc text-xs mt-1">Verified on UserRegistry</div>
                </div>
              </div>

              <div className="stats shadow-2xl bg-base-100 border border-base-300">
                <div className="stat">
                  <div className="stat-figure text-secondary">
                    <BanknotesIcon className="w-8 h-8" />
                  </div>
                  <div className="stat-title uppercase tracking-widest text-[10px] font-bold">Accumulated Fees</div>
                  <div className="stat-value text-accent font-bold">
                    {(Number(platformFees) / 10 ** 7).toFixed(2)}{" "}
                    <span className="text-sm text-accent font-normal">USDC</span>
                  </div>
                  <div className="stat-desc text-xs mt-1">Ready for Treasury Sweep</div>
                </div>
              </div>

              <div className="stats shadow-2xl bg-base-100 border border-base-300">
                <div className="stat">
                  <div className="stat-figure text-accent">
                    <CubeTransparentIcon className="w-8 h-8" />
                  </div>
                  <div className="stat-title uppercase tracking-widest text-[10px] font-bold">Protocol Assets</div>
                  <div className="stat-value text-accent">{totalPlatformAssets}</div>
                  <div className="stat-desc text-xs mt-1">RWAs in Registry</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {(Object.keys(STATE_CONFIG) as AssetStateKey[]).map(state => {
                const cfg = STATE_CONFIG[state];
                const Icon = cfg.icon;
                return (
                  <button
                    key={state}
                    onClick={() => setFilter(filter === state ? "All" : state)}
                    className={`rounded-2xl border p-4 text-left transition-all hover:scale-[1.02] hover:shadow-lg ${
                      filter === state
                        ? "ring-2 ring-primary border-transparent bg-primary/5 shadow-primary/10"
                        : "border-base-300 bg-base-100"
                    }`}
                  >
                    <Icon className={`h-6 w-6 mb-2 ${cfg.color.split(" ")[0]}`} />
                    <p className="text-2xl font-black italic">{counts[state]}</p>
                    <p className="text-[10px] text-base-content/40 font-bold uppercase tracking-[0.2em]">{state}</p>
                  </button>
                );
              })}
            </div>

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
              <button
                className={`pb-3 text-sm font-bold uppercase tracking-widest transition-all ${
                  activeTab === "governance"
                    ? "border-b-2 border-primary text-primary"
                    : "text-base-content/40 hover:text-base-content/60"
                }`}
                onClick={() => setActiveTab("governance")}
              >
                Governance
              </button>
            </div>

            {activeTab === "assets" ? (
              <>
                <div className="flex flex-wrap gap-3 mb-6">
                  <button className="btn btn-outline btn-sm gap-2" onClick={loadAssets} disabled={isLoading}>
                    <ArrowPathIcon className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>

                  <button
                    className="btn btn-warning btn-sm gap-2"
                    onClick={e => handleSweepFees(e)}
                    disabled={isSweeping}
                  >
                    {isSweeping ? (
                      <span className="loading loading-bars loading-xs" />
                    ) : (
                      <BanknotesIcon className="h-4 w-4" />
                    )}
                    Sweep Protocol Fees
                  </button>

                  <div className="ml-auto">
                    <span className="text-xs text-base-content/40 font-mono">
                      Registry:{" "}
                      <span className="text-primary">
                        {contracts.registry ? shortenStellarAddress(contracts.registry, 6) : "N/A"}
                      </span>
                    </span>
                  </div>
                </div>

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

                {isLoading ? (
                  <VaulticLoader />
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
            ) : activeTab === "compliance" ? (
              <div className="space-y-6">
                <div className="rounded-3xl border border-base-300 bg-base-100/40 backdrop-blur-md p-8 shadow-2xl shadow-primary/5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                      <IdentificationIcon className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold">Compliance management</h2>
                      <p className="text-sm text-base-content/50">User registry</p>
                    </div>
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
                    <button
                      className="btn btn-primary rounded-xl px-8 shadow-lg shadow-primary/20 stellar-glow"
                      onClick={handleSearchUser}
                      disabled={isSearchingUser}
                    >
                      {isSearchingUser ? <span className="loading loading-bars loading-xs" /> : "Lookup User"}
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
                            <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
                                Encrypted identity review
                              </p>
                              <div className="flex flex-col gap-3">
                                <div>
                                  <p className="text-[10px] text-base-content/40 uppercase mb-1">
                                    Encrypted Payload CID
                                  </p>
                                  <code className="text-[10px] bg-base-300 px-2 py-1 rounded truncate block">
                                    {foundUser.metadata_uri}
                                  </code>
                                </div>

                                {kycApplicantMeta && (
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    <div className="bg-base-200 rounded-lg p-2">
                                      <p className="text-[9px] uppercase tracking-widest text-base-content/40 mb-0.5">
                                        Full Name
                                      </p>
                                      <p className="text-xs font-bold">{kycApplicantMeta.fullName ?? "N/A"}</p>
                                    </div>
                                    <div className="bg-base-200 rounded-lg p-2">
                                      <p className="text-[9px] uppercase tracking-widest text-base-content/40 mb-0.5">
                                        Country
                                      </p>
                                      <p className="text-xs font-bold">{kycApplicantMeta.country ?? "N/A"}</p>
                                    </div>
                                    {kycApplicantMeta.submittedAt && (
                                      <div className="bg-base-200 rounded-lg p-2 col-span-2">
                                        <p className="text-[9px] uppercase tracking-widest text-base-content/40 mb-0.5">
                                          Submitted At
                                        </p>
                                        <p className="text-[10px] font-mono">
                                          {new Date(kycApplicantMeta.submittedAt).toLocaleString()}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {!decryptedFileUrl ? (
                                  <div className="flex flex-col gap-2">
                                    <input
                                      type="password"
                                      placeholder="Paste Vaultic Org Private Key to Decrypt"
                                      className="input input-bordered input-xs w-full text-[10px]"
                                      value={adminOrgKey}
                                      onChange={e => setAdminOrgKey(e.target.value)}
                                    />
                                    <button
                                      className="btn btn-primary btn-xs w-full"
                                      onClick={handleDecryptIdentity}
                                      disabled={isDecrypting || !adminOrgKey}
                                    >
                                      {isDecrypting ? (
                                        <span className="loading loading-bars loading-xs" />
                                      ) : (
                                        "Decrypt & View PII"
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="mt-2 text-center relative group">
                                    <Image
                                      src={decryptedFileUrl}
                                      alt="Decrypted ID"
                                      width={500}
                                      height={300}
                                      className="max-h-64 rounded-lg mx-auto shadow-xl border-2 border-primary/30"
                                    />
                                    <button
                                      className="btn btn-circle btn-xs absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => setDecryptedFileUrl(null)}
                                    >
                                      ✕
                                    </button>
                                    <p className="text-[10px] text-success mt-2 font-bold uppercase tracking-[0.2em]">
                                      Decrypted Successfully
                                    </p>
                                  </div>
                                )}
                              </div>
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
                            onClick={e => handleUpdateKyc(e, 2)}
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
                            onClick={e => handleUpdateKyc(e, 4)}
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
                            onClick={e => handleUpdateKyc(e, 3)}
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

                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <UserGroupIcon className="h-6 w-6 text-primary" />
                      <h2 className="text-xl font-bold">Recent KYC Applications</h2>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm gap-2"
                      onClick={loadKycSubmissions}
                      disabled={isLoadingKycApps}
                    >
                      <ArrowPathIcon className={`h-4 w-4 ${isLoadingKycApps ? "animate-spin" : ""}`} />
                      Refresh List
                    </button>
                  </div>

                  {isLoadingKycApps ? (
                    <div className="flex justify-center py-8">
                      <span className="loading loading-dots loading-md text-primary" />
                    </div>
                  ) : kycApplications.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-base-300 rounded-xl">
                      <p className="text-sm text-base-content/40">No recent KYC submissions found.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="table table-zebra w-full">
                        <thead>
                          <tr>
                            <th className="text-xs uppercase tracking-widest text-base-content/40">User Address</th>
                            <th className="text-xs uppercase tracking-widest text-base-content/40 text-right">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {kycApplications.map(addr => (
                            <tr key={addr} className="hover:bg-primary/5 transition-colors">
                              <td className="font-mono text-xs">{addr}</td>
                              <td className="text-right">
                                <button
                                  className="btn btn-primary btn-xs"
                                  onClick={() => {
                                    setKycSearchAddr(addr);
                                    setTimeout(() => handleSearchUser(), 100);
                                  }}
                                >
                                  Review
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-primary/5 border border-primary/10 p-6">
                  <div className="flex gap-4">
                    <UserGroupIcon className="h-6 w-6 text-primary shrink-0" />
                    <div>
                      <h3 className="font-semibold text-primary mb-1">KYC on Stellar</h3>
                      <p className="text-sm text-base-content/70">
                        Compliance flags live on-chain in the User Registry. Personal data stays off-chain and
                        encrypted; contracts enforce investment gating from those flags.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                <div className="space-y-6">
                  <div className="rounded-[2.5rem] bg-base-100/40 p-8 border border-base-300 shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <ShieldCheckIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold italic">On-chain governance</h3>
                        <p className="text-sm text-base-content/50">Admin wallet registry</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-base-200/50 rounded-2xl p-4 border border-base-300">
                        <p className="text-[10px] uppercase font-black tracking-widest text-base-content/40 mb-3">
                          Admin wallets
                        </p>
                        <div className="space-y-2">
                          {onChainAdmins.length === 0 ? (
                            <div className="py-8 text-center italic text-base-content/30 border border-dashed border-base-300 rounded-xl">
                              Loading administrators...
                            </div>
                          ) : (
                            onChainAdmins.map(admin => (
                              <div
                                key={admin}
                                className="flex items-center justify-between bg-base-100 px-3 py-1.5 rounded-xl border border-base-300 group"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                                  <span className="text-xs font-mono font-bold opacity-70">
                                    {shortenStellarAddress(admin, 12)}
                                  </span>
                                </div>
                                {onChainAdmins.length > 1 && (
                                  <button
                                    onClick={e => handleRemoveAdmin(e, admin)}
                                    disabled={isUpdatingAdmins}
                                    className="text-[10px] text-error font-black uppercase opacity-0 group-hover:opacity-100 transition-all hover:underline"
                                  >
                                    Revoke
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add new admin address..."
                          className="input input-ghost bg-base-200/50 rounded-xl grow text-sm font-mono focus:bg-base-200 border-base-300"
                          value={newAdminAddr}
                          onChange={e => setNewAdminAddr(e.target.value)}
                        />
                        <button
                          onClick={handleAddAdmin}
                          disabled={isUpdatingAdmins || !newAdminAddr}
                          className="btn btn-primary rounded-xl px-6 text-sm"
                        >
                          {isUpdatingAdmins ? <span className="loading loading-bars loading-xs" /> : "Authorize"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[2.5rem] bg-primary/5 p-8 border border-primary/20 shadow-xl">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-base-100 flex items-center justify-center text-primary shadow-xl border border-primary/10">
                        <ShieldCheckIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-black text-lg uppercase tracking-tight">System Integrity</h4>
                        <p className="text-xs text-base-content/60">
                          Admin power allows for protocol-level verification and issuance control. Handle with care.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[2.5rem] bg-base-100/40 p-8 border border-base-300 shadow-2xl backdrop-blur-xl">
                    <h3 className="text-xl font-black italic uppercase tracking-tight mb-4">Administrative Log</h3>
                    <p className="text-sm text-base-content/60 italic border-l-2 border-primary/20 pl-4 py-2">
                      All governance actions are recorded on the Stellar ledger for transparency and auditability.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {tokenizeTarget && publicKey && (
        <TokenizeModal
          asset={tokenizeTarget!}
          publicKey={publicKey!}
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
