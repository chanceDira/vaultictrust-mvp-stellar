import Link from "next/link";
import type { NextPage } from "next";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Litepaper",
  description:
    "Vaultic Trust litepaper: compliant RWA tokenization for Rwanda and Africa on Stellar Network. Tokenize real estate, commodities, carbon credits, and infrastructure.",
});

const LitepaperPage: NextPage = () => {
  return (
    <div className="min-h-0 flex flex-col">
      <article className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary/90 mb-2">Vaultic Trust</p>
        <h1 className="text-3xl font-bold tracking-tight text-base-content sm:text-4xl">Litepaper</h1>
        <p className="mt-1 text-sm text-base-content/50">v2.0 — Stellar Network Edition</p>

        <div className="prose prose-neutral mt-8 max-w-none">
          <p className="text-base leading-relaxed text-base-content/85">
            Vaultic Trust is the compliant Real World Asset (RWA) tokenization layer for Rwanda and Africa. This
            document outlines the vision, architecture, and roadmap for tokenizing real economy assets with verifiable
            proofs and on-chain transparency — now powered by <strong>Stellar Network</strong>.
          </p>

          <h2 className="mt-10 text-xl font-bold text-base-content">Vision</h2>
          <p className="mt-2 text-base leading-relaxed text-base-content/85">
            Unlock asset liquidity by fractionalizing real estate, commodities, carbon credits, and infrastructure into
            programmable, liquid digital assets. Compliance-first design with KYC/AML, qualified custody, and
            oracle-verified proofs of real-world assets.
          </p>

          <h2 className="mt-10 text-xl font-bold text-base-content">Why Stellar?</h2>
          <p className="mt-2 text-base leading-relaxed text-base-content/85">
            Stellar is purpose-built for real-world payments and asset tokenization. Unlike EVM chains, Stellar provides
            native token primitives, trustline-based compliance, and 3–5 second finality at fractions of a cent per
            transaction. Its ISO 20022 compatibility bridges on-chain assets to real-world payment rails — critical for
            Africa&apos;s financial inclusion mission.
          </p>

          <h2 className="mt-10 text-xl font-bold text-base-content">Architecture</h2>
          <p className="mt-2 text-base leading-relaxed text-base-content/85">
            The system is built on <strong>Stellar Network</strong> with three core modules:
          </p>
          <ul className="mt-3 list-disc list-inside space-y-2 text-base text-base-content/80">
            <li>
              <strong>Asset Registry</strong> — Soroban smart contract managing the canonical list of tokenized
              real-world assets and their lifecycle (pending → active → tokenized → closed).
            </li>
            <li>
              <strong>Stellar Asset Contracts (SAC / SEP-0041)</strong> — Each fractional asset issues a native Stellar
              token via Soroban. Users establish trustlines to receive and hold fractional shares.
            </li>
            <li>
              <strong>Investment Manager</strong> — Soroban contract handling primary issuance, funding progress, and
              proceeds distribution. Replaces the former ERC-20 investment manager.
            </li>
          </ul>
          <p className="mt-4 text-base leading-relaxed text-base-content/85">
            Compliance logic — including KYC gating, whitelisting via trustlines, freeze, and clawback — is enforced at
            the Stellar protocol level. Off-chain IPFS storage supports documentation and asset metadata.
          </p>

          <h2 className="mt-10 text-xl font-bold text-base-content">Tokenization Flow</h2>
          <ol className="mt-3 list-decimal list-inside space-y-2 text-base text-base-content/80">
            <li>Asset owner submits RWA documentation via the Owner dashboard.</li>
            <li>Vaultic Trust reviews and creates an issuing account on Stellar.</li>
            <li>Investors establish trustlines to gain compliance-cleared access.</li>
            <li>Fractional tokens are distributed; funding progress tracked on-chain.</li>
            <li>Secondary liquidity via Stellar DEX (coming in Phase 3).</li>
          </ol>

          <h2 className="mt-10 text-xl font-bold text-base-content">Roadmap</h2>
          <ul className="mt-3 list-disc list-inside space-y-2 text-base text-base-content/80">
            <li>
              <strong>Phase 1 </strong> — Frontend migration to Stellar. Freighter wallet integration. UI &amp; content
              fully Stellar-native.
            </li>
            <li>
              <strong>Phase 2</strong> — Soroban smart contract deployment. Asset Registry + Investment Manager on
              Stellar Testnet.
            </li>
            <li>
              <strong>Phase 3 (Current)</strong> — Secondary liquidity on Stellar DEX. Multi-country rollout.
            </li>
          </ul>
          <p className="mt-4 text-base leading-relaxed text-base-content/85">
            See the full litepaper at{" "}
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
