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
  ShieldCheckIcon,
  WalletIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { shortenStellarAddress } from "~~/services/stellar/horizonClient";
import {
  approveAsset,
  fetchAsset,
  fetchTotalAssets,
  getContractIds,
  sweepFees,
  tokenizeAsset,
} from "~~/services/stellar/sorobanService";
import { notification } from "~~/utils/scaffold-eth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AssetStateKey = "Pending" | "Active" | "Tokenized" | "Closed" | "Relisted";
type OwnershipModelKey = "WholeOwnership" | "Fractional";

interface OnChainAsset {
  asset_id: number;
  asset_name: string;
  asset_category: string;
  asset_code: string;
  asset_owner: string;
  state: { tag: AssetStateKey };
  model: { tag: OwnershipModelKey };
  valuation: bigint;
  total_shares: bigint;
  price_per_share: bigint;
  sold_shares: bigint;
  metadata_uri: string;
  registered_at: bigint;
  issuer: string | null;
}

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

// ---------------------------------------------------------------------------
// Tokenize Modal
// ---------------------------------------------------------------------------

function TokenizeModal({
  asset,
  onClose,
  onSuccess,
  publicKey,
}: Readonly<{
  asset: OnChainAsset;
  onClose: () => void;
  onSuccess: () => void;
  publicKey: string;
}>) {
  const [totalShares, setTotalShares] = useState("10000");
  const [pricePerShare, setPricePerShare] = useState("1000000"); // 0.10 USDC in stroops
  const [investorCap, setInvestorCap] = useState("1000");
  const [rwaIssuer, setRwaIssuer] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!rwaIssuer.trim()) {
      notification.error("RWA Issuer address is required");
      return;
    }
    setLoading(true);
    const id = notification.loading(`Tokenizing ${asset.asset_name}...`);
    try {
      await tokenizeAsset(
        {
          assetId: asset.asset_id,
          totalShares: BigInt(totalShares),
          pricePerShare: BigInt(pricePerShare),
          investorCap: BigInt(investorCap),
          rwaIssuer,
          rwaAssetCode: asset.asset_code,
        },
        publicKey,
      );
      notification.success(`${asset.asset_name} tokenized on Stellar!`);
      onSuccess();
    } catch (e: any) {
      notification.error(`Tokenization failed: ${e.message}`);
    } finally {
      setLoading(false);
      notification.remove(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-base-100 border border-base-300 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <h2 className="text-xl font-bold mb-1">Tokenize Asset</h2>
        <p className="text-sm text-base-content/60 mb-6">
          Opens an investment pool for <span className="text-primary font-semibold">{asset.asset_name}</span>
        </p>
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-base-content/60">Total Shares</span>
            <input
              className="input input-bordered w-full mt-1"
              value={totalShares}
              onChange={e => setTotalShares(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-base-content/60">
              Price Per Share (USDC stroops — 1e7 = 1 USDC)
            </span>
            <input
              className="input input-bordered w-full mt-1"
              value={pricePerShare}
              onChange={e => setPricePerShare(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-base-content/60">
              Investor Cap (0 = uncapped)
            </span>
            <input
              className="input input-bordered w-full mt-1"
              value={investorCap}
              onChange={e => setInvestorCap(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-base-content/60">
              RWA Native Asset Issuer (Stellar Address)
            </span>
            <input
              className="input input-bordered w-full mt-1 font-mono text-sm"
              placeholder="G..."
              value={rwaIssuer}
              onChange={e => setRwaIssuer(e.target.value)}
            />
            <p className="text-xs text-base-content/40 mt-1">
              The issuer account that holds and distributes native {asset.asset_code} tokens.
            </p>
          </label>
        </div>
        <div className="flex gap-3 mt-6">
          <button className="btn btn-ghost flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-primary flex-1" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="loading loading-spinner loading-sm" /> : "Tokenize Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [assets, setAssets] = useState<OnChainAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [tokenizeTarget, setTokenizeTarget] = useState<OnChainAsset | null>(null);
  const [isSweeping, setIsSweeping] = useState(false);
  const [filter, setFilter] = useState<AssetStateKey | "All">("All");
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
    } catch (e: any) {
      console.error("Failed to load assets:", e);
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
    } catch (e: any) {
      notification.error(`Approval failed: ${e.message}`);
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
    } catch (e: any) {
      notification.error(`Sweep failed: ${e.message}`);
    } finally {
      setIsSweeping(false);
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
