"use client";

import { useEffect, useState } from "react";
import { fetchTotalAssets, fetchTotalFees, fetchTotalUsers } from "~~/services/stellar/sorobanService";

type Props = {
  isDeployed: boolean;
};

export function AdminStatsPanel({ isDeployed }: Readonly<Props>) {
  const [totalUsers, setTotalUsers] = useState(0);
  const [platformFees, setPlatformFees] = useState(0n);
  const [totalAssets, setTotalAssets] = useState(0);

  useEffect(() => {
    if (!isDeployed) return;
    Promise.all([fetchTotalFees(), fetchTotalUsers(), fetchTotalAssets()]).then(([fees, users, assets]) => {
      setPlatformFees(fees);
      setTotalUsers(users);
      setTotalAssets(assets);
    });
  }, [isDeployed]);

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <p className="text-xs font-medium text-base-content/55">Verified accounts</p>
        <p className="mt-2 text-3xl font-bold tabular-nums">{totalUsers}</p>
        <p className="mt-1 text-sm font-medium text-base-content/60">Identity checks on file</p>
      </div>
      <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <p className="text-xs font-medium text-base-content/55">Collected fees</p>
        <p className="mt-2 text-3xl font-bold tabular-nums text-success">
          {(Number(platformFees) / 1e7).toFixed(2)}
          <span className="ml-2 text-sm font-semibold text-base-content/60">USDC</span>
        </p>
        <p className="mt-1 text-sm font-medium text-base-content/60">Held by the contracts</p>
      </div>
      <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <p className="text-xs font-medium text-base-content/55">Assets</p>
        <p className="mt-2 text-3xl font-bold tabular-nums">{totalAssets}</p>
        <p className="mt-1 text-sm font-medium text-base-content/60">Listings in the registry</p>
      </div>
    </div>
  );
}
