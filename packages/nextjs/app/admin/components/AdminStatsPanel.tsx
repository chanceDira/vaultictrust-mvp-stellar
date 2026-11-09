"use client";

import { useEffect, useState } from "react";
import { BanknotesIcon, CubeTransparentIcon, UserGroupIcon } from "@heroicons/react/24/outline";
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="stats shadow-2xl bg-base-100 border border-base-300">
        <div className="stat">
          <div className="stat-figure text-primary">
            <UserGroupIcon className="w-8 h-8" />
          </div>
          <div className="stat-title uppercase tracking-widest text-[10px] font-bold">Total Platform Users</div>
          <div className="stat-value text-primary">{totalUsers}</div>
          <div className="stat-desc text-xs mt-1">Verified on UserRegistry</div>
        </div>
      </div>

      <div className="stats shadow-2xl bg-base-100 border border-base-300">
        <div className="stat">
          <div className="stat-figure text-secondary">
            <BanknotesIcon className="w-8 h-8" />
          </div>
          <div className="stat-title uppercase tracking-widest text-[10px] font-bold">Accumulated Fees</div>
          <div className="stat-value text-accent font-bold">
            {(Number(platformFees) / 10 ** 7).toFixed(2)} <span className="text-sm text-accent font-normal">USDC</span>
          </div>
          <div className="stat-desc text-xs mt-1">Ready for Treasury Sweep</div>
        </div>
      </div>

      <div className="stats shadow-2xl bg-base-100 border border-base-300">
        <div className="stat">
          <div className="stat-figure text-accent">
            <CubeTransparentIcon className="w-8 h-8" />
          </div>
          <div className="stat-title uppercase tracking-widest text-[10px] font-bold">Protocol Assets</div>
          <div className="stat-value text-accent">{totalAssets}</div>
          <div className="stat-desc text-xs mt-1">RWAs in Registry</div>
        </div>
      </div>
    </div>
  );
}
