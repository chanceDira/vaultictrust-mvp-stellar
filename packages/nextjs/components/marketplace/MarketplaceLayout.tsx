"use client";

import { ExclamationTriangleIcon, Squares2X2Icon, WalletIcon } from "@heroicons/react/24/outline";
import { VaulticLoader } from "~~/components/VaulticLoader";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";
import { setupUsdcTrustline } from "~~/services/stellar/sorobanService";
import { notification } from "~~/utils/scaffold-eth";

export const MarketplaceHeader = ({ stats }: { stats?: { totalAssets: number; tvl: string } }) => (
  <>
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-xl shadow-primary/5">
          <Squares2X2Icon className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-base-content uppercase tracking-tighter italic">Marketplace</h1>
          <p className="text-[10px] text-base-content/40 uppercase tracking-[0.3em] font-bold">
            Real-World Asset Registry
          </p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0">
        <div className="rounded-2xl border border-base-300 bg-base-100/50 p-4 min-w-[140px]">
          <p className="text-[9px] uppercase tracking-widest text-base-content/40 font-bold mb-1">Active RWAs</p>
          <p className="text-xl font-black text-base-content">
            {stats?.totalAssets ?? "—"} <span className="text-[10px] font-normal opacity-50 not-italic">Items</span>
          </p>
        </div>
        <div className="rounded-2xl border border-base-300 bg-base-100/50 p-4 min-w-[140px]">
          <p className="text-[9px] uppercase tracking-widest text-base-content/40 font-bold mb-1">Ecosystem Value</p>
          <p className="text-xl font-black text-primary">
            {stats?.tvl ?? "—"} <span className="text-[10px] font-normal opacity-50 not-italic">USDC</span>
          </p>
        </div>
      </div>
    </div>
    <div className="max-w-2xl mb-12">
      <p className="text-lg text-base-content/70 leading-relaxed font-medium">
        Unlock liquidity in Africa&apos;s real economy. Invest in institutional-grade real estate, verified mining
        operations, and sustainable infrastructure on the Stellar network.
      </p>
      <div className="flex gap-3 mt-4">
        <span className="badge badge-outline border-base-300 text-[10px] uppercase font-bold p-3">Verified Assets</span>
        <span className="badge badge-outline border-base-300 text-[10px] uppercase font-bold p-3">
          Secured by Soroban
        </span>
        <span className="badge badge-outline border-base-300 text-[10px] uppercase font-bold p-3">RWA-Compliant</span>
      </div>
    </div>
  </>
);

export const ConnectWalletBanner = () => (
  <div className="rounded-2xl border border-dashed border-base-300 p-8 text-center bg-base-100 shadow-sm mb-10">
    <WalletIcon className="h-12 w-12 text-base-content/20 mx-auto mb-3" />
    <p className="font-bold text-lg mb-1 italic">Freighter Connection Required</p>
    <p className="text-sm text-base-content/60 mb-6 max-w-sm mx-auto">
      Please connect your Stellar wallet to view and participate in RWA offerings.
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
    const id = notification.loading("Preparing USDC trustline...");
    try {
      await setupUsdcTrustline(publicKey);
      notification.success("USDC Trustline established!");
      await onSuccess();
    } catch (e: any) {
      console.error(e);
      notification.error(`Failed to setup trustline: ${e.message || "Unknown error"}`);
    } finally {
      notification.remove(id);
    }
  };

  return (
    <div className="alert alert-warning mb-10 shadow-lg border border-yellow-500/30 bg-yellow-500/5 animate-in fade-in slide-in-from-top-4">
      <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
      <div className="flex-1">
        <p className="font-bold">USDC Trustline Required</p>
        <p className="text-sm text-base-content/70">
          To invest in assets, your wallet must establish a trustline for the testnet USDC asset.
        </p>
      </div>
      <button
        className="btn btn-warning btn-sm rounded-xl font-bold uppercase tracking-widest text-[10px]"
        onClick={handleSetup}
      >
        Setup USDC Trustline
      </button>
    </div>
  );
};

export const MarketplaceLoading = () => <VaulticLoader />;
