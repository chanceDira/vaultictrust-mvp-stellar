import React from "react";
import { WalletIcon } from "@heroicons/react/24/outline";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";
import { EmptyState } from "~~/components/ui/EmptyState";

type ConnectWalletPromptProps = {
  title?: string;
  description?: string;
};

export function ConnectWalletPrompt({
  title = "Connect your wallet",
  description = "Connect a Stellar wallet to sign transactions and view your holdings.",
}: ConnectWalletPromptProps) {
  return (
    <EmptyState
      icon={<WalletIcon className="h-8 w-8" />}
      title={title}
      description={description}
      action={<StellarConnectButton />}
    />
  );
}
