import type { ReactElement } from "react";
import { StarIcon } from "@heroicons/react/20/solid";

type FeaturedBadgeProps = {
  className?: string;
};

export function FeaturedBadge({ className = "" }: FeaturedBadgeProps): ReactElement {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-primary-content ${className}`}
    >
      <StarIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Featured
    </span>
  );
}
