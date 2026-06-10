"use client";

import type { NextPage } from "next";
import { PageStatus } from "~~/components/ui/PageStatus";

const ControlPanelPage: NextPage = () => {
  return (
    <PageStatus
      variant="unavailable"
      title="Control panel unavailable"
      description="This area is being migrated to Stellar and is not open in the current release."
      actions={[
        { label: "Asset owners", href: "/owner", primary: true },
        { label: "Go home", href: "/" },
      ]}
    />
  );
};

export default ControlPanelPage;
