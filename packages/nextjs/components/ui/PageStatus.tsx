import Link from "next/link";
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";

type PageStatusAction = {
  label: string;
  href?: string;
  primary?: boolean;
  onClick?: () => void;
};

type PageStatusProps = {
  code?: string;
  title: string;
  description?: string;
  variant?: "404" | "error" | "unavailable" | "empty";
  actions?: PageStatusAction[];
  onRetry?: () => void;
  className?: string;
};

const variantIcons = {
  "404": MagnifyingGlassIcon,
  error: ExclamationTriangleIcon,
  unavailable: WrenchScrewdriverIcon,
  empty: MagnifyingGlassIcon,
} as const;

export function PageStatus({
  code,
  title,
  description,
  variant = "404",
  actions = [],
  onRetry,
  className = "",
}: PageStatusProps) {
  const Icon = variantIcons[variant];

  const defaultActions: PageStatusAction[] =
    actions.length > 0
      ? actions
      : variant === "404"
        ? [
            { label: "Go home", href: "/", primary: true },
            { label: "Marketplace", href: "/marketplace" },
          ]
        : variant === "error"
          ? [{ label: "Go home", href: "/", primary: true }]
          : [{ label: "Go home", href: "/", primary: true }];

  return (
    <section
      className={`relative flex flex-1 flex-col items-center justify-center px-4 py-16 sm:py-24 ${className}`}
      aria-labelledby="page-status-title"
    >
      {code && /^\d+$/.test(code) && (
        <span
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none text-center text-[7rem] font-black leading-none tracking-tighter text-base-content/[0.04] sm:text-[10rem]"
          aria-hidden
        >
          {code}
        </span>
      )}

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-base-300/80 bg-base-100 shadow-sm">
          <Icon className="h-7 w-7 text-primary/80" aria-hidden />
        </div>

        {code && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{code}</p>}

        <h1 id="page-status-title" className="page-title mt-2">
          {title}
        </h1>

        {description && <p className="page-subtitle mx-auto mt-3 max-w-sm">{description}</p>}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {defaultActions.map(({ label, href, primary, onClick }) => {
            const className = primary
              ? "btn btn-primary rounded-xl px-5"
              : "btn btn-outline rounded-xl border-base-content/15 px-5";

            if (onClick) {
              return (
                <button key={label} type="button" onClick={onClick} className={className}>
                  {label}
                </button>
              );
            }

            if (!href) return null;

            return (
              <Link key={label} href={href} className={className}>
                {label}
              </Link>
            );
          })}

          {onRetry && (
            <button type="button" onClick={onRetry} className="btn btn-ghost gap-2 rounded-xl px-5">
              <ArrowPathIcon className="h-4 w-4" />
              Try again
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
