import React from "react";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`rounded-2xl border border-base-300/80 bg-base-100/60 p-10 text-center shadow-sm backdrop-blur-sm sm:p-12 ${className}`}
    >
      {icon && (
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-base-300/60 bg-base-200/50 text-base-content/30">
          {icon}
        </div>
      )}
      <h2 className="text-lg font-semibold tracking-tight text-base-content">{title}</h2>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-base-content/60">{description}</p>
      )}
      {action && <div className="mt-7 flex justify-center">{action}</div>}
    </div>
  );
}
