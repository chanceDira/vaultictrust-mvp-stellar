"use client";

import { ExclamationTriangleIcon, WalletIcon } from "@heroicons/react/24/outline";
import { VaulticLoader } from "~~/components/VaulticLoader";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";
import { StatCard } from "~~/components/ui/StatCard";
import { setupUsdcTrustline } from "~~/services/stellar/sorobanService";
import { notification } from "~~/utils/vaultic";

export const MarketplaceHeader = ({ stats }: { stats?: { totalAssets: number; tvl: string } }) => (
  <>
    <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-center">
      <div>
        <h1 className="page-title">Marketplace</h1>
        <p className="section-label mt-1">Registered real-world assets</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0">
        <StatCard
          label="Active listings"
          value={
            <>
              {stats?.totalAssets ?? "N/A"} <span className="text-base font-normal text-base-content/50">assets</span>
            </>
          }
          className="min-w-[140px]"
        />
        <StatCard
          label="Total valuation"
          value={
            <>
              {stats?.tvl ?? "N/A"} <span className="text-base font-normal text-base-content/50">USDC</span>
            </>
          }
          className="min-w-[140px]"
        />
      </div>
    </div>
    <div className="mb-12 max-w-2xl">
      <p className="page-subtitle">
        Browse approved assets on Stellar. Complete KYC and add a USDC trustline before you invest.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="badge badge-outline border-base-300">Admin reviewed</span>
        <span className="badge badge-outline border-base-300">Soroban contracts</span>
        <span className="badge badge-outline border-base-300">KYC required</span>
      </div>
    </div>
  </>
);

export const ConnectWalletBanner = () => (
  <div className="mb-10 rounded-2xl border border-dashed border-base-300 bg-base-100 p-8 text-center shadow-sm">
    <WalletIcon className="mx-auto mb-3 h-12 w-12 text-base-content/20" />
    <p className="mb-1 text-lg font-semibold">Connect your wallet</p>
    <p className="mx-auto mb-6 max-w-sm text-sm text-base-content/60">
      Connect Freighter to view listings and invest in registered assets.
    </p>
    <StellarConnectButton />
  </div>
);

export const WalletPreparationBanner = ({
  publicKey,
  onSuccess,
}: {
  publicKey: string;
  onSuccess: () => Promise<void>;
}) => {
  const handleSetup = async () => {
    const id = notification.loading("Setting up USDC trustline...");
    try {
      await setupUsdcTrustline(publicKey);
      notification.success("USDC trustline added.");
      await onSuccess();
    } catch (e: any) {
      console.error(e);
      notification.error(`Trustline setup failed: ${e.message || "Unknown error"}`);
    } finally {
      notification.remove(id);
    }
  };

  return (
    <div className="alert alert-warning mb-10 animate-in fade-in slide-in-from-top-4 border border-yellow-500/30 bg-yellow-500/5 shadow-lg">
      <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
      <div className="flex-1">
        <p className="font-semibold">USDC trustline required</p>
        <p className="text-sm text-base-content/70">Add a USDC trustline in your wallet before you can invest.</p>
      </div>
      <button className="btn btn-warning btn-sm rounded-xl" onClick={handleSetup}>
        Add USDC trustline
      </button>
    </div>
  );
};

export const MarketplaceLoading = () => <VaulticLoader />;
