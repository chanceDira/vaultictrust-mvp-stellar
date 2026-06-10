import React from "react";

type SectionLabelProps = {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
};

export function SectionLabel({ children, icon, className = "" }: SectionLabelProps) {
  return (
    <h2 className={`section-label flex items-center gap-2 ${className}`}>
      {icon}
      {children}
    </h2>
  );
}
