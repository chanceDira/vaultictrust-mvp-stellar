"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { FeaturedAssetsShowcase } from "~~/components/home/FeaturedAssetsShowcase";
import { EARLY_ACCESS_FORM_URL } from "~~/scaffold.config";

const STEPS = [
  {
    title: "An owner submits an asset",
    description: "They send the documents and choose a full sale or shares.",
  },
  {
    title: "VTrust Africa reviews it",
    description: "A listing goes on the marketplace only after that review.",
  },
  {
    title: "An investor buys shares",
    description: "You use a Stellar wallet. The shares show up in your portfolio.",
  },
];

const Home: NextPage = () => {
  return (
    <div className="flex min-h-0 flex-col">
      <section className="px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <div className="mx-auto w-full max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-base-content sm:text-5xl">
            Own a share of a real asset
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-relaxed text-base-content/85 sm:text-lg">
            VTrust Africa lists real assets from Rwanda and across Africa. Owners submit an asset. After a review,
            investors buy shares with a Stellar wallet.
          </p>
          <div className="mt-6 flex w-full flex-col items-stretch justify-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/marketplace" className="btn btn-primary btn-lg min-h-12 gap-2 rounded-2xl px-8 font-bold">
              Browse listings
              <ArrowRightIcon className="h-5 w-5 shrink-0" />
            </Link>
            <a
              href={EARLY_ACCESS_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-lg min-h-12 rounded-2xl border-2 border-base-content/15 px-8 font-bold"
            >
              Get early access
            </a>
          </div>
        </div>
      </section>

      <section className="border-t border-base-300/80 bg-base-200/40 py-8 sm:py-10">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">
          <FeaturedAssetsShowcase />
        </div>
      </section>

      <section className="py-8 sm:py-12">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">
          <h2 className="text-center text-2xl font-bold text-base-content sm:text-3xl">How a listing works</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-base-300/80 bg-base-100 p-5">
                <p className="text-sm font-bold text-primary">{index + 1}</p>
                <h3 className="mt-2 text-lg font-bold text-base-content">{step.title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-base-content/75">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-base-300/80 bg-base-200/40 py-8 sm:py-12">
        <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
          <h2 className="text-2xl font-bold text-base-content sm:text-3xl">Why the shares run on Stellar</h2>
          <p className="mt-3 text-base font-semibold leading-relaxed text-base-content/80">
            A payment settles in a few seconds, and the fee is a fraction of a cent. Before your wallet can hold a
            share, you add a trustline. That step ties the shares to your account.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Home;
