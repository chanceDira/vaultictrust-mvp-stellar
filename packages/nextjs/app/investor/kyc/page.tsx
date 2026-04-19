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
    <div className="flex flex-col grow bg-base-200/20 min-h-screen">
      <section className="px-4 py-8 md:py-16 max-w-4xl mx-auto w-full">
        {/* Breadcrumb / Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-base-content/40 hover:text-primary transition-colors mb-8 group"
        >
          <ChevronLeftIcon className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        {!isConnected ? (
          <div className="max-w-xl mx-auto text-center py-20 bg-base-100 rounded-3xl border border-dashed border-base-300 shadow-sm p-12">
            <ShieldCheckIcon className="h-16 w-16 text-base-content/10 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4">Identity Verification</h1>
            <p className="text-base-content/60 mb-8 leading-relaxed">
              Please connect your Stellar wallet (Freighter) to begin the verification process. Your verification status
              will be tied to your public key.
            </p>
            <StellarConnectButton />
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-700">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold tracking-tight mb-4">Compliance Center</h1>
              <p className="text-base-content/50 max-w-lg mx-auto leading-relaxed">
                Vaultic Trust implements institutional-grade KYC protocols to ensure all Real-World Asset tokenization
                remains compliant with regional regulations.
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
