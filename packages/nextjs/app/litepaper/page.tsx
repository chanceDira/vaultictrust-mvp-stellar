import Link from "next/link";
import type { NextPage } from "next";
import { DocArticleFooter, DocArticleHeader } from "~~/components/ui/DocArticleHeader";
import { getMetadata } from "~~/utils/vaultic/getMetadata";

export const metadata = getMetadata({
  title: "Litepaper",
  description:
    "How VTrust Africa lists real assets and sells shares on Stellar. What is live today, and what is not.",
});

const LitepaperPage: NextPage = () => {
  return (
    <div className="flex min-h-0 flex-col">
      <article className="mx-auto w-full max-w-3xl px-5 py-8 text-center sm:px-8 sm:py-10 sm:text-left [&_p]:font-semibold">
        <DocArticleHeader title="Litepaper" meta="November 2026" />

        <p className="text-base leading-relaxed text-base-content/85">
          VTrust Africa lets an owner list a real asset, and lets an investor buy shares in it. The shares live on
          Stellar. Payments are in USDC.
        </p>

        <h2 className="mt-8 text-xl font-bold text-base-content">What you can do today</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-left text-base text-base-content/80">
          <li>An owner submits an asset and the documents that describe it.</li>
          <li>VTrust Africa reviews the submission before it appears on the marketplace.</li>
          <li>An investor verifies their identity, adds a trustline, and buys shares.</li>
          <li>An owner can pay yield in USDC. Investors claim their part from the portfolio page.</li>
        </ul>

        <h2 className="mt-8 text-xl font-bold text-base-content">How a listing moves</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-left text-base text-base-content/80">
          <li>The owner sends the asset from the owner page.</li>
          <li>A reviewer approves it, or asks for changes.</li>
          <li>Share listings are split into shares and shown on the marketplace.</li>
          <li>The investor connects Freighter, passes the identity check, and buys.</li>
        </ol>

        <h2 className="mt-8 text-xl font-bold text-base-content">What sits behind the pages</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-left text-base text-base-content/80">
          <li>A registry contract stores each asset and whether it is pending, active, or closed.</li>
          <li>Shares are ordinary Stellar assets. Your wallet has to trust an asset before it can hold it.</li>
          <li>A sales contract checks that you are verified, then takes USDC and sends shares.</li>
          <li>A yield contract records each USDC payout so holders can claim their share.</li>
          <li>Identity files are encrypted in the browser. The chain stores a reference, not the document.</li>
        </ul>

        <h2 className="mt-8 text-xl font-bold text-base-content">What is not live</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          You cannot yet resell shares to another person inside VTrust Africa. More countries and more kinds of assets
          are still to come. The site does not offer a bank on-ramp, escrow, or custody.
        </p>

        <h2 className="mt-8 text-xl font-bold text-base-content">Why Stellar</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          Payments confirm in a few seconds and cost a fraction of a cent. A trustline is the wallet&apos;s agreement to
          hold one specific share. That is the control we use before shares can land in an account.
        </p>

        <DocArticleFooter>
          <Link href="/marketplace" className="btn btn-primary rounded-xl">
            Browse listings
          </Link>
          <Link href="/owner" className="btn btn-outline rounded-xl border-base-content/20">
            List an asset
          </Link>
        </DocArticleFooter>
      </article>
    </div>
  );
};

export default LitepaperPage;
