import Image from "next/image";
import Link from "next/link";
import type { NextPage } from "next";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Support",
  description:
    "Get help with Vaultic Trust. FAQ, transaction flows, wallet confirmations, and how to contact the team.",
});

const SUPPORT_LINKS = [
  {
    label: "Terms of Service",
    href: "/terms",
    description: "Platform terms, transaction flows, and wallet confirmations",
  },
  { label: "Privacy Policy", href: "/privacy", description: "How we handle your data and privacy" },
  { label: "Litepaper", href: "/litepaper", description: "Vision, architecture, and roadmap" },
];

const FAQ = [
  {
    q: "Why do I need to approve a 'Trustline' before buying?",
    a: "On the Stellar Network, an account must explicitly 'trust' an asset before it can hold its tokens. This acts as a native compliance layer. When you first invest in a Vaultic asset, you'll be asked to establish a Trustline in your wallet. This is a one-time setup per asset that protects you from receiving unwanted or malicious tokens.",
  },
  {
    q: 'My transaction failed with "No Trustline". What do I do?',
    a: "This means the trustline transaction was rejected or hasn't finished being recorded on the ledger. Ensure you approve the first wallet popup to establish the trustline, then proceed to the purchase confirmation. If you're using Freighter, double-check that you have enough XLM (at least 2-3 XLM) to cover the network reserve for new trustlines.",
  },
  {
    q: "Which network does Vaultic Trust use?",
    a: "We are built on the Stellar Network. For testnet, we use the Stellar Testnet. Always ensure your wallet (e.g. Freighter) is set to the correct network as shown in the top header of the platform.",
  },
  {
    q: "Do I need to create an account?",
    a: "No registration is required. You only need a Stellar-compatible wallet like Freighter and some Stellar USDC for investments. All your holdings are tied directly to your Stellar public key.",
  },
  {
    q: "Where can I read about transaction flows and trustlines?",
    a: "Our Terms of Service explain the Stellar asset model, including trustlines and one-step purchases, along with all in-app status messages.",
  },
];

const SupportPage: NextPage = () => {
  return (
    <div className="min-h-0 flex flex-col">
      <article className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="flex items-center gap-3 mb-2">
          <div className="relative w-10 h-10 shrink-0">
            <Image alt="Vaultic Trust" fill src="/logo.png" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-base-content sm:text-4xl">Support</h1>
            <p className="text-sm font-medium uppercase tracking-wider text-primary/90">Vaultic Trust</p>
          </div>
        </div>

        <p className="mt-6 text-base leading-relaxed text-base-content/85">
          Find answers to common questions and links to our legal and product documentation. For transaction flows and
          wallet confirmations (including the three popups when buying shares), see the Terms of Service.
        </p>

        <h2 className="mt-10 text-xl font-bold text-base-content">Documentation &amp; Legal</h2>
        <ul className="mt-4 space-y-3">
          {SUPPORT_LINKS.map(({ label, href, description }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 p-3 rounded-xl border border-base-300/70 bg-base-100 hover:border-primary/30 hover:shadow-sm"
              >
                <span className="font-semibold text-base-content group-hover:text-primary">{label}</span>
                <span className="text-sm text-base-content/70">{description}</span>
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-xl font-bold text-base-content">Frequently Asked Questions</h2>
        <ul className="mt-4 space-y-6">
          {FAQ.map(({ q, a }, i) => (
            <li key={i} className="rounded-xl border border-base-300/70 bg-base-100 p-4 sm:p-5">
              <h3 className="font-semibold text-base-content">{q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-base-content/85">{a}</p>
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-xl font-bold text-base-content">Contact</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          For technical issues, partnership inquiries, or feedback, reach out via the official channels listed on{" "}
          <a href="https://vaultictrust.com" target="_blank" rel="noreferrer" className="link link-primary">
            vaultictrust.com
          </a>
          . We do not provide support via direct messages from unofficial accounts; always verify links and handles.
        </p>

        <div className="mt-12 flex flex-wrap gap-4">
          <Link href="/" className="btn btn-primary gap-2 rounded-xl">
            Back to home
          </Link>
          <Link href="/terms" className="btn btn-outline rounded-xl border-base-content/20">
            Terms of Service
          </Link>
          <Link href="/privacy" className="btn btn-ghost rounded-xl">
            Privacy Policy
          </Link>
        </div>
      </article>
    </div>
  );
};

export default SupportPage;
