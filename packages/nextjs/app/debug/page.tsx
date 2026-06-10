"use client";

import type { NextPage } from "next";
import { PageStatus } from "~~/components/ui/PageStatus";

const DebugPage: NextPage = () => {
  return (
    <PageStatus
      variant="unavailable"
      title="Debug tools unavailable"
      description="Contract debugging for Soroban is not enabled in this build yet. Use the Stellar CLI or Stellar Expert for contract inspection."
      actions={[
        { label: "Marketplace", href: "/marketplace", primary: true },
        { label: "Go home", href: "/" },
      ]}
    />
  );
};

export default DebugPage;
