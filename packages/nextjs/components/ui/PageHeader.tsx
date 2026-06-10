import React from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, subtitle, icon, action, className = "" }: PageHeaderProps) {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div className="flex items-start gap-4">
        {icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            {icon}
          </div>
        )}
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle mt-2">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
