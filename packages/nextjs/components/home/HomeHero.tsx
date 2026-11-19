import type { ReactElement } from "react";
import Link from "next/link";
import { ArrowRightIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { HeroSpotlight } from "~~/components/home/HeroSpotlight";
import vaulticConfig, { EARLY_ACCESS_FORM_URL } from "~~/scaffold.config";

const PROMISES = ["Every listing reviewed first", "ID encrypted in your browser", "Fee shown before you sign"];

function networkLine(): string {
  if (vaulticConfig.targetNetwork === "testnet") return "Live on Stellar testnet. Mainnet is next.";
  return "Live on Stellar.";
}

export function HomeHero(): ReactElement {
  return (
    <section className="relative overflow-hidden px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:px-12">
      <div className="landing-dots" aria-hidden />
      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-base-100/80 px-3 py-1 text-xs font-semibold text-base-content/80 backdrop-blur sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
            {networkLine()}
          </p>
          <h1 className="mt-6 max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-tight text-base-content sm:text-5xl lg:text-6xl">
            Own a piece of Africa&apos;s <span className="text-primary">real economy</span>
          </h1>
          <p className="mt-6 max-w-xl text-base font-medium leading-relaxed text-base-content/80 sm:text-lg">
            VTrust Africa splits real assets from Rwanda and across Africa into shares you can buy with USDC. Buildings,
            farms, mines, and infrastructure are reviewed before they are listed. Every share and every payout is
            recorded on Stellar.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/marketplace" className="btn btn-primary btn-lg min-h-12 gap-2 rounded-2xl px-8 font-bold">
              Browse listings
              <ArrowRightIcon className="h-5 w-5 shrink-0" />
            </Link>
            <Link
              href="/owner"
              className="btn btn-outline btn-lg min-h-12 rounded-2xl border-2 border-base-content/15 px-8 font-bold"
            >
              List your asset
            </Link>
          </div>
          <p className="mt-4 text-sm font-medium text-base-content/65">
            Want to hear when mainnet opens?{" "}
            <a
              href={EARLY_ACCESS_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-primary hover:underline"
            >
              Get early access
            </a>
          </p>
          <ul className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
            {PROMISES.map(promise => (
              <li key={promise} className="flex items-center gap-2 text-sm font-semibold text-base-content/75">
                <CheckCircleIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                {promise}
              </li>
            ))}
          </ul>
        </div>
        <HeroSpotlight />
      </div>
    </section>
  );
}
