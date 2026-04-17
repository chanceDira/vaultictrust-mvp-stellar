import Image from "next/image";
import Link from "next/link";
import type { NextPage } from "next";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Privacy Policy",
  description:
    "Privacy Policy for Vaultic Trust. How we handle wallet connections, chain data, and your privacy when using the platform.",
});

const PrivacyPage: NextPage = () => {
  return (
    <div className="min-h-0 flex flex-col">
      <article className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="flex items-center gap-3 mb-2">
          <div className="relative w-10 h-10 shrink-0">
            <Image alt="Vaultic Trust" fill src="/logo.png" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-base-content sm:text-4xl">Privacy Policy</h1>
            <p className="text-sm font-medium uppercase tracking-wider text-primary/90">Vaultic Trust</p>
          </div>
        </div>

        <p className="mt-6 text-base leading-relaxed text-base-content/85">
          Last updated: March 2025. Vaultic Trust (&quot;we&quot;, &quot;us&quot;) respects your privacy. This policy
          describes how we handle information in connection with the Vaultic Trust web application and related services.
        </p>

        <h2 className="mt-10 text-xl font-bold text-base-content">1. Decentralized &amp; On-Chain Nature</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          Vaultic Trust is a decentralized application (dApp). Asset ownership, tokenization status, and investment data
          are recorded on public blockchains (e.g. Avalanche C-Chain). Once a transaction is confirmed, the data it
          writes is public and persistent. We do not control the blockchain or third-party wallets; we provide an
          interface to interact with smart contracts.
        </p>

        <h2 className="mt-10 text-xl font-bold text-base-content">2. Information We Do Not Collect</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          We do not require account registration or personal identification to use the core Platform. We do not collect
          or store your name, email, or other personally identifiable information (PII) on our servers for normal use of
          the dApp.
        </p>

        <h2 className="mt-10 text-xl font-bold text-base-content">3. Wallet &amp; Chain Data</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          When you connect a wallet (e.g. via MetaMask or WalletConnect), your wallet address and the chain you use are
          available to the frontend to send transactions and read on-chain state. Transaction signing happens in your
          wallet; we do not see or store your private keys. Public blockchain data (addresses, balances, transactions)
          is read from the chain or public RPC/indexing services and may be temporarily processed in the browser to
          display the UI. We do not log or store your wallet address on our backend for routine operation.
        </p>

        <h2 className="mt-10 text-xl font-bold text-base-content">4. Third-Party Services</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          The Platform may use third-party services for wallet connection (e.g. RainbowKit, WalletConnect), RPC
          providers, and hosting. Those services have their own privacy practices. We encourage you to review their
          policies. We do not sell your data to third parties.
        </p>

        <h2 className="mt-10 text-xl font-bold text-base-content">5. Cookies &amp; Local Storage</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          We may use local storage or similar technologies in your browser to remember preferences (e.g. theme, last
          connected chain). This data stays on your device. We do not use it to track you across other sites.
        </p>

        <h2 className="mt-10 text-xl font-bold text-base-content">6. Support &amp; Contact</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          If you contact us for support (e.g. via the Support page or email), we may retain the content of your message
          and contact details only to respond and improve our services. We will not use them for marketing unless you
          consent.
        </p>

        <h2 className="mt-10 text-xl font-bold text-base-content">7. Changes</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          We may update this Privacy Policy. The &quot;Last updated&quot; date at the top will reflect the latest
          version. Continued use of the Platform after changes constitutes acceptance of the updated policy.
        </p>

        <h2 className="mt-10 text-xl font-bold text-base-content">8. Contact</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          For privacy-related questions, see our{" "}
          <Link href="/support" className="link link-primary">
            Support
          </Link>{" "}
          page.
        </p>

        <div className="mt-12 flex flex-wrap gap-4">
          <Link href="/" className="btn btn-primary gap-2 rounded-xl">
            Back to home
          </Link>
          <Link href="/terms" className="btn btn-outline rounded-xl border-base-content/20">
            Terms of Service
          </Link>
          <Link href="/support" className="btn btn-ghost rounded-xl">
            Support
          </Link>
        </div>
      </article>
    </div>
  );
};

export default PrivacyPage;
