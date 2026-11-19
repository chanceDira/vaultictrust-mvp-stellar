import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  showTagline?: boolean;
  showWordmark?: boolean;
  compact?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  href?: string;
  className?: string;
  iconClassName?: string;
};

const logoHeights = { sm: 40, md: 48, lg: 56, xl: 64 } as const;

const wordmarkScale = {
  sm: "text-sm sm:text-lg",
  md: "text-base sm:text-xl",
  lg: "text-xl sm:text-2xl",
  xl: "text-2xl sm:text-3xl",
} as const;

const compactWordmarkScale = {
  sm: "text-xs sm:text-lg",
  md: "text-sm sm:text-xl",
  lg: "text-lg sm:text-2xl",
  xl: "text-xl sm:text-3xl",
} as const;

export function BrandLogo({
  showTagline = false,
  showWordmark = true,
  compact = false,
  size = "md",
  href = "/",
  className = "",
  iconClassName = "",
}: BrandLogoProps) {
  const height = logoHeights[size];
  const wordmarkClass = compact ? compactWordmarkScale[size] : wordmarkScale[size];
  const iconFrame = compact
    ? "h-8 w-8 max-[374px]:hidden sm:h-[var(--logo-h)] sm:w-[var(--logo-h)]"
    : "h-[var(--logo-h)] w-[var(--logo-h)]";

  const content = (
    <div className={`flex min-w-0 items-center gap-1.5 sm:gap-3 ${compact ? "max-[374px]:gap-0" : ""} ${className}`}>
      <span
        className={`block shrink-0 ${iconFrame} ${iconClassName}`}
        style={{ ["--logo-h" as string]: `${height}px` }}
        aria-hidden
      >
        <Image
          src="/logo.jpeg"
          alt=""
          width={height}
          height={height}
          className="h-full w-full rounded-[2px] object-contain mix-blend-multiply dark:hidden"
          priority
        />
        <Image
          src="/logo-dark.jpeg"
          alt=""
          width={height}
          height={height}
          className="hidden h-full w-full object-contain mix-blend-lighten dark:block"
          priority
        />
      </span>
      {(showWordmark || showTagline) && (
        <div className="flex min-w-0 flex-col leading-none">
          {showWordmark && (
            <span
              className={`brand-wordmark whitespace-nowrap ${wordmarkClass} ${
                compact ? "max-[374px]:overflow-visible max-[374px]:text-clip" : "truncate"
              }`}
            >
              VTRUST<span className="brand-trust">AFRICA</span>
            </span>
          )}
          {showTagline && (
            <span className="brand-tagline mt-1.5 hidden whitespace-nowrap sm:inline">Real assets on Stellar</span>
          )}
        </div>
      )}
    </div>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className={`inline-flex min-w-0 max-w-full shrink overflow-hidden transition-opacity hover:opacity-90 ${
        compact ? "max-[374px]:shrink-0 max-[374px]:overflow-visible" : ""
      }`}
      aria-label="VTrust Africa home"
    >
      {content}
    </Link>
  );
}
