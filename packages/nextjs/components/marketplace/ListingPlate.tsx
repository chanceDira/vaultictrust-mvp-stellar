import type { ReactElement, ReactNode } from "react";

type ListingPlateProps = {
  code: string;
  category: string;
  imageUrl: string | null;
  status: string;
  forSale: boolean;
  tall?: boolean;
  children?: ReactNode;
};

const PLATE_TINT: Record<string, string> = {
  "Real Estate": "from-primary/30 via-primary/10 to-base-200",
  Infrastructure: "from-info/30 via-info/10 to-base-200",
};

export function ListingPlate({
  code,
  category,
  imageUrl,
  status,
  forSale,
  tall = false,
  children,
}: ListingPlateProps): ReactElement {
  const tint = PLATE_TINT[category] ?? "from-primary/20 via-base-200 to-base-200";
  const frame = tall ? "min-h-36 sm:min-h-44" : "h-28 sm:h-32";

  return (
    <div className={`relative overflow-hidden border-b border-base-300/70 ${frame}`}>
      {imageUrl ? (
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${tint}`} />
      )}
      {tall || imageUrl ? (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-base-100 via-base-100/50 to-transparent" />
      ) : null}
      <p
        className={`pointer-events-none absolute bottom-3 right-3 z-0 max-w-[42%] truncate text-right text-3xl font-bold tracking-tight text-base-content/15 ${
          tall ? "hidden sm:block" : ""
        }`}
      >
        {code}
      </p>
      <div className="absolute left-3 top-3 z-10 flex max-w-[58%] items-center">
        <span className="truncate rounded-md bg-base-100/90 px-2 py-0.5 text-xs font-semibold text-base-content/80">
          {category}
        </span>
      </div>
      <span
        className={`absolute right-3 top-3 z-10 rounded-md px-2 py-0.5 text-xs font-semibold ${
          forSale ? "bg-success/15 text-success" : "bg-base-100/90 text-base-content/60"
        }`}
      >
        {status}
      </span>
      {children ? (
        <div className="relative z-10 flex min-h-36 flex-col justify-end p-4 pt-12 sm:min-h-44 sm:p-5">{children}</div>
      ) : null}
    </div>
  );
}
