"use client";

import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { KycOnboardingWizard } from "~~/components/stellar/KycOnboardingWizard";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";

export default function KycPage() {
  const { isConnected, publicKey } = useStellarWallet();
  const router = useRouter();

  return (
    <div className="flex flex-col grow min-h-screen">
      <section className="px-4 py-8 md:py-16 max-w-4xl mx-auto w-full">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 hover:text-primary transition-all mb-10 group"
        >
          <ChevronLeftIcon className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Dashboard
        </button>

        {!isConnected ? (
          <div className="max-w-xl mx-auto text-center py-20 bg-base-100/40 backdrop-blur-md rounded-[2.5rem] border border-base-300 shadow-2xl shadow-primary/5 p-12">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-primary/20 shadow-inner">
              <ShieldCheckIcon className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-4 italic">Verification</h1>
            <p className="text-sm text-base-content/60 mb-10 leading-relaxed max-w-sm mx-auto">
              Please connect your Stellar wallet (Freighter) to initiate the institutional-grade verification process.
            </p>
            <StellarConnectButton />
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-700">
            <div className="text-center mb-16">
              <h1 className="text-5xl font-black tracking-tighter mb-4 uppercase">
                Compliance <span className="text-primary italic">Center</span>
              </h1>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-base-content/30 max-w-lg mx-auto leading-relaxed">
                Vaultic implements institutional-grade KYC protocols for compliant RWA tokenization.
              </p>
            </div>

            <KycOnboardingWizard publicKey={publicKey || ""} onComplete={() => router.push("/investor")} />

            <p className="text-center text-[10px] text-base-content/30 mt-8 max-w-xs mx-auto uppercase tracking-widest leading-relaxed">
              By proceeding, you agree to the transmission of your commitment hash to the Stellar Testnet ledger.
              Vaultic Trust does not store unencrypted PII.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
