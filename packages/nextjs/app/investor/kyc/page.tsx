"use client";

import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { KycOnboardingWizard } from "~~/components/stellar/KycOnboardingWizard";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { ConnectWalletPrompt } from "~~/components/ui/ConnectWalletPrompt";

export default function KycPage() {
  const { isConnected, publicKey } = useStellarWallet();
  const router = useRouter();

  return (
    <div className="flex min-h-screen grow flex-col">
      <section className="mx-auto w-full max-w-4xl px-3 py-8 sm:px-4 md:py-16">
        <button
          onClick={() => router.back()}
          className="group mb-10 flex items-center gap-2 text-sm text-base-content/50 transition-all hover:text-primary"
        >
          <ChevronLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back
        </button>

        {!isConnected ? (
          <ConnectWalletPrompt
            title="Connect your wallet"
            description="Connect Freighter to start identity verification."
          />
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-700">
            <div className="mb-16 text-center">
              <h1 className="page-title">Identity verification</h1>
              <p className="page-subtitle mx-auto mt-3 max-w-lg">
                Submit encrypted documents for KYC review. Only a commitment hash is stored on-chain.
              </p>
            </div>

            <KycOnboardingWizard publicKey={publicKey || ""} onComplete={() => router.push("/investor")} />

            <p className="mx-auto mt-8 max-w-md text-center text-xs text-base-content/50">
              By submitting, you agree to record a commitment hash on Stellar. Vaultic does not store unencrypted
              identity documents on our servers.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
