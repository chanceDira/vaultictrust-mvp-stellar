import Link from "next/link";
import type { NextPage } from "next";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Litepaper",
  description:
    "Vaultic Trust litepaper: compliant RWA tokenization for Rwanda and Africa. Tokenize real estate, commodities, carbon credits, and infrastructure.",
});

const LitepaperPage: NextPage = () => {
  return (
    <div className="min-h-0 flex flex-col">
      <article className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight text-base-content sm:text-4xl">Litepaper</h1>
        <p className="mt-2 text-sm font-medium uppercase tracking-wider text-primary/90">Vaultic Trust</p>
        <div className="prose prose-neutral mt-8 max-w-none">
          <p className="text-base leading-relaxed text-base-content/85">
            Vaultic Trust is the compliant Real World Asset (RWA) tokenization layer for Rwanda and Africa. This
            document outlines the vision, architecture, and roadmap for tokenizing real economy assets with verifiable
            proofs and on-chain transparency.
          </p>
          <h2 className="mt-10 text-xl font-bold text-base-content">Vision</h2>
          <p className="mt-2 text-base leading-relaxed text-base-content/85">
            Unlock asset liquidity by fractionalizing real estate, commodities, carbon credits, and infrastructure into
            programmable, liquid digital assets. Compliance-first design with KYC/AML, qualified custody, and
            oracle-verified proofs.
          </p>
          <h2 className="mt-10 text-xl font-bold text-base-content">Architecture</h2>
          <p className="mt-2 text-base leading-relaxed text-base-content/85">
            The system is built on Avalanche C-Chain with three core contracts: Asset Registry (canonical asset ledger),
            Fractional Ownership Tokens (ERC20 per asset), and Investment Manager (primary issuance and funding).
            Ownership and funding progress are on-chain; off-chain storage supports documentation and metadata.
          </p>
          <h2 className="mt-10 text-xl font-bold text-base-content">Roadmap</h2>
          <p className="mt-2 text-base leading-relaxed text-base-content/85">
            MVP focuses on asset listing, tokenization, and investment flows. Subsequent phases will address secondary
            liquidity and multi-country rollout. See the full litepaper at{" "}
            <a href="https://vaultictrust.com" target="_blank" rel="noreferrer" className="link link-primary">
              vaultictrust.com
            </a>{" "}
            for the latest version.
          </p>
        </div>
        <div className="mt-12 flex flex-wrap gap-4">
          <Link href="/" className="btn btn-primary gap-2 rounded-xl">
            Back to home
          </Link>
          <Link href="/owner" className="btn btn-outline rounded-xl border-base-content/20">
            Get Early Access
          </Link>
        </div>
      </article>
    </div>
  );
};

export default LitepaperPage;
