import React from "react";

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
};

export function StatCard({ label, value, hint, icon, className = "" }: StatCardProps) {
  return (
    <div className={`rounded-2xl border border-base-300 bg-base-100/50 p-5 ${className}`}>
      <div className="mb-2 flex items-center gap-2 text-base-content/60">
        {icon}
        <span className="section-label">{label}</span>
      </div>
      <p className="stat-value text-base-content">{value}</p>
      {hint && <p className="mt-1 text-sm text-base-content/50">{hint}</p>}
    </div>
  );
}
