import Link from "next/link";
import type { NextPage } from "next";
import { ArrowRightIcon, CheckIcon } from "@heroicons/react/24/outline";
import { GuideSteps } from "~~/components/guide/GuideSteps";
import { SectionHeading } from "~~/components/home/SectionHeading";
import { PageIntro } from "~~/components/ui/PageIntro";
import { getMetadata } from "~~/utils/vaultic/getMetadata";
import { GUIDE_NEEDS, INVESTOR_STEPS, OWNER_STEPS, SALE_TYPES } from "~~/utils/vaultic/guideContent";

export const metadata = getMetadata({
  title: "How it works",
  description:
    "Step by step: how investors buy shares in real assets on VTrust Africa, and how owners list an asset and get paid in USDC.",
});

const HowItWorksPage: NextPage = () => {
  return (
    <div className="flex min-h-0 flex-col">
      <PageIntro
        label="How it works"
        title="Everything that happens between a listing and your wallet"
        lede="A plain walkthrough for both sides. What you need, what you sign, and what the contracts do for you at each step."
      >
        <Link href="#investors" className="btn btn-primary rounded-xl px-6 font-bold">
          I want to invest
        </Link>
        <Link href="#owners" className="btn btn-outline rounded-xl border-base-content/15 px-6 font-bold">
          I own an asset
        </Link>
      </PageIntro>

      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto w-full max-w-7xl">
          <SectionHeading label="Before you start" title="What you need">
            Four things, and you only set most of them up once.
          </SectionHeading>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {GUIDE_NEEDS.map((need, index) => (
              <li key={need.title} className="rounded-3xl border border-base-300 bg-base-100 p-6">
                <p className="text-3xl font-extrabold text-primary/30">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 text-lg font-bold text-base-content">{need.title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-base-content/75">{need.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="investors"
        className="scroll-mt-20 border-y border-base-300/80 bg-base-200/50 px-5 py-16 sm:px-8 sm:py-20 lg:px-12"
      >
        <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SectionHeading label="For investors" title="Buying your first share">
              Seven steps from a fresh wallet to a share that can pay yield. You verify your identity once, and add each
              trustline once.
            </SectionHeading>
          </div>
          <GuideSteps steps={INVESTOR_STEPS} />
        </div>
      </section>

      <section id="owners" className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SectionHeading label="For asset owners" title="Listing an asset and getting paid">
              You keep control of your wallet the whole way. VTrust Africa reviews the listing, and the contracts handle
              the sale, the fee, and the payouts.
            </SectionHeading>
          </div>
          <GuideSteps steps={OWNER_STEPS} />
        </div>
      </section>

      <section className="border-t border-base-300/80 bg-base-200/50 px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto w-full max-w-7xl">
          <SectionHeading label="Two kinds of listing" title="Shares or the whole asset">
            Every listing is one or the other. The listing page tells you which before you buy.
          </SectionHeading>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {SALE_TYPES.map(saleType => (
              <article key={saleType.title} className="rounded-3xl border border-base-300 bg-base-100 p-6 sm:p-8">
                <h3 className="text-2xl font-bold text-base-content">{saleType.title}</h3>
                <ul className="mt-5 space-y-3">
                  {saleType.points.map(point => (
                    <li key={point} className="flex gap-3 text-base font-medium text-base-content/80">
                      <CheckIcon className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="mt-8 max-w-3xl text-sm font-semibold leading-relaxed text-base-content/70">
            Neither kind of purchase transfers legal title by itself. A protocol fee is taken from each purchase. See
            the{" "}
            <Link href="/fees" className="text-primary hover:underline">
              fees
            </Link>{" "}
            and the{" "}
            <Link href="/risks" className="text-primary hover:underline">
              risks
            </Link>{" "}
            before you buy.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/marketplace" className="btn btn-primary gap-2 rounded-xl px-6 font-bold">
              Browse listings
              <ArrowRightIcon className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/faq" className="btn btn-ghost rounded-xl px-6 font-bold text-primary">
              Read the FAQ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorksPage;
