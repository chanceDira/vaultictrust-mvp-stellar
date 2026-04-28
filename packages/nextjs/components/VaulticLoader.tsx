import React from "react";

export const VaulticLoader = ({
  message = "Fetching Ledger State...",
  className = "py-24",
}: {
  message?: string;
  className?: string;
}) => (
  <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
    <span className="loading loading-bars loading-lg text-primary" />
    {message && <p className="text-sm font-bold uppercase tracking-widest text-base-content/40">{message}</p>}
  </div>
);
