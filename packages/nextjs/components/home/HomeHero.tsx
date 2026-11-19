import type { ReactElement } from "react";
import Link from "next/link";
import { HeroSpotlight } from "~~/components/home/HeroSpotlight";
import vaulticConfig, { EARLY_ACCESS_FORM_URL } from "~~/scaffold.config";

export function HomeHero(): ReactElement {
  return (
    <section className="px-5 pb-14 pt-10 sm:px-8 sm:pb-20 sm:pt-16 lg:px-12">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
        <div>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.1] tracking-tight text-base-content sm:text-5xl">
            Own part of a real asset in Africa
          </h1>
          <p className="mt-5 max-w-xl text-base font-medium leading-relaxed text-base-content/75 sm:text-lg">
            Owners list hotels, buildings, farms, and other assets from Rwanda and across Africa. After a review, the
            asset is split into shares, and verified investors buy them with USDC on Stellar.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/marketplace" className="btn btn-primary min-h-12 rounded-xl px-7 font-bold">
              Browse listings
            </Link>
            <Link href="/owner" className="btn btn-outline min-h-12 rounded-xl border-base-content/20 px-7 font-bold">
              List an asset
            </Link>
          </div>
          {vaulticConfig.targetNetwork === "testnet" ? (
            <p className="mt-5 text-sm font-medium text-base-content/60">
              Mainnet is not open yet.{" "}
              <a
                href={EARLY_ACCESS_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Ask for early access
              </a>
            </p>
          ) : null}
        </div>
        <HeroSpotlight />
      </div>
    </section>
  );
}
