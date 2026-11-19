import type { ReactElement } from "react";
import Link from "next/link";
import vaulticConfig from "~~/scaffold.config";

function invitation(): string {
  if (vaulticConfig.targetNetwork === "testnet") {
    return "Everything runs on testnet, so you can try a purchase with testnet USDC at no cost.";
  }
  return "Read the documents on any listing before you buy.";
}

export function ClosingCallToAction(): ReactElement {
  return (
    <section className="border-t border-base-300/80 px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <h2 className="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">See what is listed</h2>
          <p className="mt-2 text-base font-medium leading-relaxed text-base-content/70">{invitation()}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          <Link href="/marketplace" className="btn btn-primary min-h-12 rounded-xl px-7 font-bold">
            Browse listings
          </Link>
          <Link href="/owner" className="btn btn-outline min-h-12 rounded-xl border-base-content/20 px-7 font-bold">
            List an asset
          </Link>
        </div>
      </div>
    </section>
  );
}
