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
      <section className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn btn-ghost btn-sm mb-8 gap-2 rounded-xl font-semibold"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Back
        </button>

        {!isConnected ? (
          <ConnectWalletPrompt
            title="Connect your wallet"
            description="Connect a Stellar wallet to start identity verification."
          />
        ) : (
          <div>
            <div className="mb-8 text-center md:text-left">
              <h1 className="page-title">Verify your identity</h1>
              <p className="page-subtitle mx-auto mt-3 max-w-lg">
                Your documents are encrypted in the browser before they leave it. The chain stores a reference, not the
                file.
              </p>
            </div>

            <KycOnboardingWizard publicKey={publicKey || ""} onComplete={() => router.push("/investor")} />

            <p className="mx-auto mt-8 max-w-md text-center text-xs text-base-content/50">
              By submitting, you agree that a reference is recorded on Stellar. VTrust Africa does not store the
              unencrypted document on our servers.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
