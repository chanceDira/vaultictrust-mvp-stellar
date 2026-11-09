"use client";

import { ArrowPathIcon, UserGroupIcon } from "@heroicons/react/24/outline";

type Props = {
  applications: string[];
  isLoading: boolean;
  onRefresh: () => void;
  onReview: (addr: string) => void;
};

export function KycApplicationList({ applications, isLoading, onRefresh, onReview }: Readonly<Props>) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <UserGroupIcon className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Recent KYC Applications</h2>
        </div>
        <button className="btn btn-ghost btn-sm gap-2" onClick={onRefresh} disabled={isLoading}>
          <ArrowPathIcon className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh List
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-dots loading-md text-primary" />
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-base-300 rounded-xl">
          <p className="text-sm text-base-content/40">No recent KYC submissions found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th className="text-xs uppercase tracking-widest text-base-content/40">User Address</th>
                <th className="text-xs uppercase tracking-widest text-base-content/40 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map(addr => (
                <tr key={addr} className="hover:bg-primary/5 transition-colors">
                  <td className="font-mono text-xs">{addr}</td>
                  <td className="text-right">
                    <button className="btn btn-primary btn-xs" onClick={() => onReview(addr)}>
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
