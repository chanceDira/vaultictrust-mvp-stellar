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
          Last updated: March 2025. By using Vaultic Trust (&quot;Platform&quot;, &quot;we&quot;, &quot;us&quot;) you
          agree to these terms. The Platform provides a decentralized application for tokenizing real-world assets (RWA)
          on Avalanche C-Chain. You are responsible for compliance with local laws and for the security of your wallet.
        </p>

        <h2 className="mt-10 text-xl font-bold text-base-content">1. How the Platform Works</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          Vaultic Trust connects asset owners with investors. Asset owners list real-world assets and choose whole-asset
          sale or fractional tokenization (ERC20 shares). Investors browse the marketplace and purchase whole assets or
          shares. Ownership and funding progress are recorded on-chain. Payments use a designated payment token (e.g.
          USDC on Avalanche Fuji). All material state changes are executed via smart contracts; the interface only
          triggers and displays them.
        </p>

        <h2 className="mt-10 text-xl font-bold text-base-content">
          2. Transaction Executions &amp; Wallet Confirmations
        </h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          Every action that changes on-chain state (listing an asset, tokenizing, buying shares, withdrawing proceeds,
          etc.) requires one or more transactions. Each transaction must be signed and confirmed in your wallet (e.g.
          MetaMask). The Platform will show loading and status messages; you must complete the corresponding wallet
          popups for the action to succeed.
        </p>

        <h3 className="mt-6 text-lg font-semibold text-base-content">2.1 Buying Shares: Three Wallet Confirmations</h3>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          When you buy fractional shares, the payment token (e.g. USDC) requires the smart contract to be allowed to
          spend your tokens before it can transfer them. To keep the flow secure and compatible with tokens like USDC,
          the app performs three separate steps. <strong>You will see three wallet popups in sequence:</strong>
        </p>
        <ol className="mt-4 list-decimal list-inside space-y-2 text-base leading-relaxed text-base-content/85">
          <li>
            <strong>Reset allowance</strong> — The first popup sets your existing allowance for the Investment Manager
            to zero. This is required by some tokens (including USDC) before changing to a new amount. In-app message:
            &quot;Resetting allowance… Confirm in your wallet.&quot;
          </li>
          <li>
            <strong>Approve payment amount</strong> — The second popup approves the exact amount you will pay (shares ×
            price per share, plus any displayed protocol fee). In-app message: &quot;Approving payment token… Confirm in
            your wallet.&quot; After this, you may see: &quot;Waiting for approval to confirm…&quot; until the
            transaction is mined.
          </li>
          <li>
            <strong>Confirm purchase</strong> — The third popup executes the actual purchase. The contract transfers
            your payment token and mints/assigns your shares. In-app message: &quot;Approval confirmed. Now confirm the
            purchase in your wallet.&quot; Then the purchase transaction is sent.
          </li>
        </ol>
        <p className="mt-4 text-base leading-relaxed text-base-content/85">
          Do not close the app or reject a popup midway; all three steps must complete for the purchase to succeed. If
          any step fails or is rejected, the purchase will not go through and you can try again.
        </p>

        <h3 className="mt-6 text-lg font-semibold text-base-content">2.2 Other Actions</h3>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          Listing an asset, tokenizing, relisting, withdrawing proceeds, and protocol actions (e.g. control panel) each
          require one or more wallet confirmations as shown in the app. Always wait for in-app success messages and
          check your wallet or a block explorer to confirm transactions have been mined.
        </p>

        <h2 className="mt-10 text-xl font-bold text-base-content">3. In-App Communications</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          The Platform shows notifications and messages to guide you through each step:
        </p>
        <ul className="mt-3 list-disc list-inside space-y-1 text-base leading-relaxed text-base-content/85">
          <li>
            <strong>Loading</strong> — e.g. &quot;Approving payment token…&quot;, &quot;Waiting for approval to
            confirm…&quot; — means a transaction is in progress; complete the matching wallet popup and wait for the
            next message.
          </li>
          <li>
            <strong>Success</strong> — e.g. &quot;Approval confirmed. Now confirm the purchase in your wallet.&quot;,
            &quot;Shares purchased.&quot; — means that step completed; proceed to the next popup if prompted.
          </li>
          <li>
            <strong>Errors</strong> — If a transaction fails or is rejected, an error message will be shown (e.g. from
            the contract or wallet). You can retry after fixing the issue (e.g. sufficient balance, correct network).
          </li>
        </ul>
        <p className="mt-4 text-base leading-relaxed text-base-content/85">
          These messages are for guidance only. On-chain confirmation (e.g. block explorer) is the source of truth for
          whether a transaction succeeded.
        </p>

        <h2 className="mt-10 text-xl font-bold text-base-content">4. Risks &amp; Disclaimers</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          Smart contracts and blockchain transactions carry risk. You use the Platform at your own risk. We do not
          guarantee availability, accuracy of off-chain data, or that any asset or token will retain value. You are
          solely responsible for your wallet, keys, and compliance with applicable law. Nothing here is financial,
          legal, or tax advice.
        </p>

        <h2 className="mt-10 text-xl font-bold text-base-content">5. Changes</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          We may update these terms. Continued use after changes constitutes acceptance. For material changes we will
          use reasonable means to notify users (e.g. notice on the Platform or updated &quot;Last updated&quot; date).
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
