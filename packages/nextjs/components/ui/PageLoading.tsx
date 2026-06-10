import { VaulticLoader } from "~~/components/VaulticLoader";

export function PageLoading({ label = "Loading" }: { label?: string }) {
  return <VaulticLoader message={label} className="flex-1 px-4 py-20 sm:py-28" />;
}

export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mx-auto w-full max-w-7xl animate-pulse px-4 py-10 sm:px-6 lg:px-8" aria-hidden>
      <div className="h-8 w-48 rounded-lg bg-base-300/40" />
      <div className="mt-3 h-4 w-72 max-w-full rounded bg-base-300/30" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl border border-base-300/40 bg-base-200/50" />
        ))}
      </div>
    </div>
  );
}
