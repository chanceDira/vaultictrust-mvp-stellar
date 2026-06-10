import Link from "next/link";
import type { NextPage } from "next";
import { DocArticleFooter, DocArticleHeader } from "~~/components/ui/DocArticleHeader";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Litepaper",
  description:
    "Vaultic Trust litepaper: RWA tokenization for Rwanda and Africa on Stellar. Real estate, commodities, and infrastructure.",
});

const LitepaperPage: NextPage = () => {
  return (
    <div className="min-h-0 flex flex-col">
      <article className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <DocArticleHeader title="Litepaper" meta="Version 3.0 · Stellar Network" />

        <div className="prose prose-neutral mt-4 max-w-none">
          <p className="text-base leading-relaxed text-base-content/85">
            Vaultic Trust is a Real World Asset (RWA) tokenization platform for Rwanda and Africa. This document
            outlines the vision, architecture, and roadmap for listing and fractionalizing assets with on-chain records,
            powered by the <strong>Stellar Network</strong>.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-base-content">Vision</h2>
          <p className="mt-2 text-base leading-relaxed text-base-content/85">
            Make real estate, commodities, carbon credits, and infrastructure easier to fund and transfer by issuing
            fractional shares on Stellar. The platform is designed for KYC/AML review, documented assets, and clear
            on-chain lifecycle states.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-base-content">Why Stellar</h2>
          <p className="mt-2 text-base leading-relaxed text-base-content/85">
            Stellar supports native assets, trustline-based access control, and fast settlement at low cost.
            Transactions typically confirm in a few seconds. Stellar also connects to standard payment rails, which
            matters for cross-border use in Africa.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-base-content">Architecture</h2>
          <p className="mt-2 text-base leading-relaxed text-base-content/85">
            The system runs on Stellar with Soroban contracts for business logic and native Stellar assets for
            fractional shares:
          </p>
          <ul className="mt-3 list-disc list-inside space-y-2 text-base text-base-content/80">
            <li>
              <strong>Asset Registry.</strong> Soroban contract that stores registered assets and lifecycle states
              (pending, active, tokenized, closed).
            </li>
            <li>
              <strong>Native Stellar assets.</strong> Fractional shares are issued as Stellar assets. Investors add
              trustlines before receiving shares.
            </li>
            <li>
              <strong>Investment Manager.</strong> Soroban contract for primary sales, pool accounting, and KYC checks
              before investment.
            </li>
            <li>
              <strong>Dividend Manager.</strong> Soroban contract for USDC yield rounds and pro-rata claims.
            </li>
          </ul>
          <p className="mt-4 text-base leading-relaxed text-base-content/85">
            KYC status is stored on-chain in the User Registry. Asset metadata and documents may be linked through IPFS
            URIs.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-base-content">Tokenization flow</h2>
          <ol className="mt-3 list-decimal list-inside space-y-2 text-base text-base-content/80">
            <li>An asset owner submits documentation through the owner dashboard.</li>
            <li>Vaultic admins review and approve the listing.</li>
            <li>Fractional assets are tokenized and listed on the marketplace.</li>
            <li>Investors complete KYC, add trustlines, and purchase shares.</li>
            <li>Owners distribute yield; investors claim dividends in USDC.</li>
          </ol>

          <h2 className="mt-10 text-xl font-semibold text-base-content">Roadmap</h2>
          <ul className="mt-3 list-disc list-inside space-y-2 text-base text-base-content/80">
            <li>
              <strong>Phase 1 (complete).</strong> Stellar frontend, Freighter integration, owner and investor
              dashboards.
            </li>
            <li>
              <strong>Phase 2 (complete).</strong> Soroban contracts deployed on Stellar for asset registry, investment,
              and dividends.
            </li>
            <li>
              <strong>Phase 3 (in progress).</strong> Secondary trading, additional countries, and expanded asset
              coverage.
            </li>
          </ul>
          <p className="mt-4 text-base leading-relaxed text-base-content/85">
            See{" "}
            <a href="https://vaultictrust.com" target="_blank" rel="noreferrer" className="link link-primary">
              vaultictrust.com
            </a>{" "}
            for updates.
          </p>
        </div>

        <DocArticleFooter>
          <Link href="/" className="btn btn-primary gap-2 rounded-xl">
            Back to home
          </Link>
          <Link href="/owner" className="btn btn-outline rounded-xl border-base-content/20">
            Owner dashboard
          </Link>
        </DocArticleFooter>
      </article>
    </div>
  );
};

export default LitepaperPage;
