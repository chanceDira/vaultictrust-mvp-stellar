"use client";

import { useEffect } from "react";
import { PageStatus } from "~~/components/ui/PageStatus";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Vaultic] Route error:", error);
  }, [error]);

  return (
    <PageStatus
      code="500"
      variant="error"
      title="Something went wrong"
      description="An unexpected error occurred while loading this page. You can try again or return home."
      onRetry={reset}
      actions={[{ label: "Go home", href: "/", primary: true }]}
    />
  );
}
