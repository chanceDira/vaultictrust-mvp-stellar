"use client";

import { useEffect } from "react";
import { Montserrat } from "next/font/google";
import Link from "next/link";

const montserrat = Montserrat({ subsets: ["latin"], display: "swap" });

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Vaultic] Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className={`${montserrat.className} min-h-screen bg-[#0a0a0a] text-[#f5f3ff] antialiased`}>
        <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b5cf6]">Error</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Application error</h1>
          <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-[#f5f3ff]/70">
            The app hit a critical error. Refresh the page or try again in a moment.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-xl bg-[#8b5cf6] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90"
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded-xl border border-[#f5f3ff]/15 px-5 py-2.5 text-sm font-semibold text-[#f5f3ff] transition-opacity hover:opacity-80"
            >
              Go home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
