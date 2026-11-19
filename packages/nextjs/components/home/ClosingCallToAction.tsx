import type { ReactElement } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import vaulticConfig, { EARLY_ACCESS_FORM_URL } from "~~/scaffold.config";

function invitation(): string {
  if (vaulticConfig.targetNetwork === "testnet") {
    return "Browse what is listed, read the documents, and try a purchase with testnet USDC. Nothing you do on testnet costs real money.";
  }
  return "Browse what is listed, read the documents, and buy your first share when you are ready.";
}

export function ClosingCallToAction(): ReactElement {
  return (
    <section className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
      <div className="relative mx-auto w-full max-w-7xl overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 px-6 py-14 text-center sm:px-12 sm:py-20">
        <div className="landing-dots" aria-hidden />
        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-base-content sm:text-5xl">Come and look around</h2>
          <p className="mt-5 text-base font-medium leading-relaxed text-base-content/75 sm:text-lg">{invitation()}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/marketplace" className="btn btn-primary btn-lg min-h-12 gap-2 rounded-2xl px-8 font-bold">
              Browse listings
              <ArrowRightIcon className="h-5 w-5" aria-hidden />
            </Link>
            <Link
              href="/owner"
              className="btn btn-outline btn-lg min-h-12 rounded-2xl border-2 border-base-content/15 px-8 font-bold"
            >
              List your asset
            </Link>
          </div>
          {vaulticConfig.targetNetwork === "testnet" ? (
            <p className="mt-6 text-sm font-medium text-base-content/65">
              Waiting for mainnet?{" "}
              <a
                href={EARLY_ACCESS_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-primary hover:underline"
              >
                Get early access
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
