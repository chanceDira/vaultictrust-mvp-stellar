import Link from "next/link";
import type { NextPage } from "next";
import { DocArticleFooter, DocArticleHeader } from "~~/components/ui/DocArticleHeader";
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
        <DocArticleHeader title="Privacy Policy" meta="Last updated: April 2026" />

        <p className="text-base leading-relaxed text-base-content/85">
          Vaultic Trust (&quot;we&quot;, &quot;us&quot;) respects your privacy. This policy describes how we handle
          information in connection with the Vaultic Trust web application and related services.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-base-content">1. Decentralized and on-chain nature</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          Vaultic Trust is a decentralized application. Asset ownership, tokenization status, and investment data are
          recorded on public blockchains, including the <strong>Stellar Network</strong>. Once a transaction is
          confirmed, the data it writes is public and persistent. We do not control the blockchain or third-party
          wallets. We provide an interface to interact with Soroban smart contracts and native Stellar assets.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-base-content">2. Information we do not collect</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          We do not require account registration or personal identification to use the core Platform. We do not collect
          or store your name, email, or other personally identifiable information on our servers for normal use of the
          dApp.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-base-content">3. Wallet and chain data</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          When you connect a wallet through <strong>Freighter</strong>, your wallet address and network are available to
          the frontend to send transactions and read on-chain state. Transaction signing happens in your wallet. We do
          not see or store your private keys. Public blockchain data (addresses, balances, transactions) is read from
          the chain or public Horizon and Soroban RPC services and may be temporarily processed in the browser to
          display the UI. We do not log or store your wallet address on our backend for routine operation.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-base-content">4. Third-party services</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          The Platform may use third-party services for IPFS storage, RPC providers, and hosting. Those services have
          their own privacy practices. We encourage you to review their policies. We do not sell your data to third
          parties.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-base-content">5. Cookies and local storage</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          We may use local storage or similar technologies in your browser to remember preferences (for example, theme).
          This data stays on your device. We do not use it to track you across other sites.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-base-content">6. KYC submissions</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          If you submit KYC information, identity documents are encrypted in your browser before upload. A commitment
          hash and metadata reference may be stored on-chain. Decryption is limited to authorized compliance reviewers.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-base-content">7. Support and contact</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          If you contact us for support, we may retain the content of your message and contact details only to respond
          and improve our services. We will not use them for marketing unless you consent.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-base-content">8. Changes</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          We may update this Privacy Policy. The &quot;Last updated&quot; date at the top reflects the latest version.
          Continued use of the Platform after changes constitutes acceptance of the updated policy.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-base-content">9. Contact</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          For privacy-related questions, see our{" "}
          <Link href="/support" className="link link-primary">
            Support
          </Link>{" "}
          page.
        </p>

        <DocArticleFooter>
          <Link href="/" className="btn btn-primary gap-2 rounded-xl">
            Back to home
          </Link>
          <Link href="/terms" className="btn btn-outline rounded-xl border-base-content/20">
            Terms of Service
          </Link>
          <Link href="/support" className="btn btn-ghost rounded-xl">
            Support
          </Link>
        </DocArticleFooter>
      </article>
    </div>
  );
};

export default PrivacyPage;
