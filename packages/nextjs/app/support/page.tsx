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
    q: "Why do I see three wallet popups when buying shares?",
    a: "Buying shares uses a payment token (e.g. USDC) that requires the smart contract to have your approval before it can transfer tokens. For security and compatibility with tokens like USDC, we do three steps: (1) reset your current allowance to zero, (2) approve the exact purchase amount, (3) execute the purchase. Each step is one wallet confirmation. This is expected and documented in our Terms of Service.",
  },
  {
    q: 'My transaction failed with "transfer amount exceeds allowance". What do I do?',
    a: "This usually means the approval step did not complete on-chain before the purchase ran. Make sure you approve all three popups in order and wait for each to confirm. If you previously rejected one of the approvals, try the full flow again (all three steps).",
  },
  {
    q: "Which network does Vaultic Trust use?",
    a: "We run on Avalanche C-Chain. For testnet we use Avalanche Fuji. Make sure your wallet is connected to the correct network; the app will show it in the header.",
  },
  {
    q: "Do I need to create an account?",
    a: "No. You only need a compatible Web3 wallet (e.g. MetaMask) and the payment token (e.g. USDC on Fuji for testnet). Connect your wallet to use the Platform.",
  },
  {
    q: "Where can I read about transaction flows and in-app messages?",
    a: "Our Terms of Service explain how transactions work, the three wallet confirmations for buying shares, and all in-app communications (loading, success, and error messages).",
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
