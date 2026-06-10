import React from "react";

export const VaulticLoader = ({
  message = "Loading",
  className = "py-24",
}: {
  message?: string;
  className?: string;
}) => (
  <div className={`flex flex-col items-center justify-center gap-4 ${className}`} role="status" aria-live="polite">
    <span className="loading loading-bars loading-lg text-primary" />
    {message && <p className="text-sm font-medium text-base-content/50">{message}</p>}
  </div>
);
