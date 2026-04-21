import Image from "next/image";
import Link from "next/link";
import type { NextPage } from "next";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Terms of Service",
  description:
    "Terms of Service for Vaultic Trust. Learn how transactions work, wallet confirmations, and your rights when using the platform.",
});

const TermsPage: NextPage = () => {
  return (
    <div className="min-h-0 flex flex-col">
      <article className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="flex items-center gap-3 mb-2">
          <div className="relative w-10 h-10 shrink-0">
            <Image alt="Vaultic Trust" fill src="/logo.png" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-base-content sm:text-4xl">Terms of Service</h1>
            <p className="text-sm font-medium uppercase tracking-wider text-primary/90">Vaultic Trust</p>
          </div>
        </div>

        <p className="mt-6 text-base leading-relaxed text-base-content/85">
          Last updated: April 2026. By using Vaultic Trust (&quot;Platform&quot;, &quot;we&quot;, &quot;us&quot;) you
          agree to these terms. The Platform provides a decentralized application for tokenizing real-world assets (RWA)
          on the **Stellar Network**. You are responsible for compliance with local laws and for the security of your
          wallet.
        </p>

        <h2 className="mt-10 text-xl font-bold text-base-content">1. How the Platform Works</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          Vaultic Trust connects asset owners with investors. Asset owners list real-world assets and choose whole-asset
          sale or fractional tokenization (Stellar-native fractional tokens). Investors browse the marketplace and
          purchase whole assets or shares. Ownership and funding progress are recorded on-chain. Payments use a
          designated payment token (e.g. USDC on Stellar Testnet). All material state changes are executed via Soroban
          smart contracts or native Stellar operations; the interface only triggers and displays them.
        </p>

        <h2 className="mt-10 text-xl font-bold text-base-content">
          2. Transaction Executions &amp; Wallet Confirmations
        </h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          Every action that changes on-chain state (listing an asset, tokenizing, buying shares, withdrawing proceeds,
          etc.) requires one or more transactions. Each transaction must be signed and confirmed in your wallet (e.g.
          Freighter). The Platform will show loading and status messages; you must complete the corresponding wallet
          popups for the action to succeed.
        </p>

        <h3 className="mt-6 text-lg font-semibold text-base-content">2.1 Buying Shares: Trustlines &amp; Purchases</h3>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          On Stellar, you must explicitly &quot;trust&quot; an asset before you can receive it. This is handled via a
          **Trustline**. Unlike other networks that require multiple approvals for every purchase, Stellar simplifies
          this flow:
        </p>
        <ol className="mt-4 list-decimal list-inside space-y-2 text-base leading-relaxed text-base-content/85">
          <li>
            <strong>Establish Trustline</strong> — Before your first purchase of a specific asset, you will be prompted
            to add a Trustline to that asset in your wallet. This is a one-time setup for each unique asset.
          </li>
          <li>
            <strong>Confirm Purchase</strong> — Once a Trustline is established, you can execute purchases in a single
            transaction. The contract transfers your payment token and assigns your fractional shares to your Stellar
            account.
          </li>
        </ol>
        <p className="mt-4 text-base leading-relaxed text-base-content/85">
          Do not close the app or reject a popup midway; the transaction must complete for the purchase to succeed. If
          the transaction fails or is rejected, the purchase will not go through and you can try again.
        </p>

        <h3 className="mt-6 text-lg font-semibold text-base-content">2.2 Other Actions</h3>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          Listing an asset, tokenizing, and withdrawing proceeds each require one or more wallet confirmations as shown
          in the app. Always wait for in-app success messages and check a block explorer (e.g. Stellar Expert) to
          confirm transactions have been mined.
        </p>

        <h2 className="mt-10 text-xl font-bold text-base-content">3. In-App Communications</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          The Platform shows notifications and messages to guide you through each step:
        </p>
        <ul className="mt-3 list-disc list-inside space-y-1 text-base leading-relaxed text-base-content/85">
          <li>
            <strong>Loading</strong> — means a transaction is in progress on the Stellar ledger; complete the matching
            wallet popup and wait for the next message.
          </li>
          <li>
            <strong>Success</strong> — means that step completed; proceed to the next step if prompted.
          </li>
          <li>
            <strong>Errors</strong> — If a transaction fails (e.g. insufficient XLM for fees, or missing Trustline), an
            error message will be shown. You can retry after fixing the issue.
          </li>
        </ul>
        <p className="mt-4 text-base leading-relaxed text-base-content/85">
          These messages are for guidance only. On-chain confirmation (e.g. block explorer) is the source of truth for
          whether a transaction succeeded.
        </p>

        <h2 className="mt-10 text-xl font-bold text-base-content">4. Risks &amp; Disclaimers</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          Soroban smart contracts and Stellar transactions carry risk. You use the Platform at your own risk. We do not
          guarantee availability, accuracy of off-chain data, or that any asset or token will retain value. You are
          solely responsible for your wallet, keys, and compliance with applicable law. Nothing here is financial,
          legal, or tax advice.
        </p>

        <h2 className="mt-10 text-xl font-bold text-base-content">5. Changes</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          We may update these terms to reflect protocol upgrades or network changes. Continued use after changes
          constitutes acceptance.
        </p>

        <h2 className="mt-10 text-xl font-bold text-base-content">6. Contact</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          For questions about these terms or the Platform, see our{" "}
          <Link href="/support" className="link link-primary">
            Support
          </Link>{" "}
          page.
        </p>

        <div className="mt-12 flex flex-wrap gap-4">
          <Link href="/" className="btn btn-primary gap-2 rounded-xl">
            Back to home
          </Link>
          <Link href="/support" className="btn btn-outline rounded-xl border-base-content/20">
            Support
          </Link>
          <Link href="/privacy" className="btn btn-ghost rounded-xl">
            Privacy Policy
          </Link>
        </div>
      </article>
    </div>
  );
};

export default TermsPage;
