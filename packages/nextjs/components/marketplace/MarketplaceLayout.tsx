"use client";

import { Squares2X2Icon, WalletIcon } from "@heroicons/react/24/outline";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";

export const MarketplaceHeader = () => (
  <>
    <div className="flex items-center gap-4 mb-4">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
        <Squares2X2Icon className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h1 className="text-4xl font-black text-base-content uppercase tracking-tighter">Marketplace</h1>
        <p className="text-[10px] text-base-content/40 uppercase tracking-[0.2em] font-bold">
          Real-World Asset Opportunities
        </p>
      </div>
    </div>
    <p className="text-base-content/70 mb-8 max-w-2xl leading-relaxed">
      Unlock high-yield African assets through Stellar. Participate in shared ownership of commercial real estate,
      sustainable infrastructure, and industrial ventures.
    </p>
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

export const MarketplaceLoading = () => (
  <div className="flex flex-col items-center justify-center py-24 gap-4">
    <span className="loading loading-bars loading-lg text-primary" />
    <p className="text-sm font-bold uppercase tracking-widest text-base-content/40">Fetching Ledger State...</p>
  </div>
);
