import Link from "next/link";
import type { NextPage } from "next";
import { DocArticleFooter, DocArticleHeader } from "~~/components/ui/DocArticleHeader";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Support",
  description: "Help with Vaultic Trust. FAQ, transaction flows, wallet setup, and how to contact the team.",
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
    q: "Why do I need a trustline before buying shares?",
    a: "On Stellar, an account must trust an asset before it can hold that asset. When you invest in a Vaultic asset for the first time, you will be asked to add a trustline in Freighter. This is a one-time step per asset.",
  },
  {
    q: 'My transaction failed with "No trustline". What should I do?',
    a: "Approve the trustline prompt first, wait for it to confirm, then submit the purchase. Keep at least 2 to 3 XLM in your wallet to cover network reserves for new trustlines.",
  },
  {
    q: "Which network does Vaultic Trust use?",
    a: "Vaultic Trust runs on the Stellar network. Connect Freighter and approve transactions when prompted.",
  },
  {
    q: "Do I need to create an account?",
    a: "No email registration is required. You need a Stellar wallet such as Freighter and USDC for investments. Holdings are tied to your Stellar public key.",
  },
  {
    q: "Where can I read about transaction flows?",
    a: "The Terms of Service describe trustlines, purchases, and the in-app status messages you will see during each step.",
  },
];

const SupportPage: NextPage = () => {
  return (
    <div className="min-h-0 flex flex-col">
      <article className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <DocArticleHeader title="Support" />

        <p className="text-base leading-relaxed text-base-content/85">
          Common questions and links to product and legal documentation. For trustline and purchase steps, see the Terms
          of Service.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-base-content">Documentation and legal</h2>
        <ul className="mt-4 space-y-3">
          {SUPPORT_LINKS.map(({ label, href, description }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex flex-col gap-1 rounded-xl border border-base-300/70 bg-base-100 p-3 hover:border-primary/30 hover:shadow-sm sm:flex-row sm:items-center sm:gap-3"
              >
                <span className="font-semibold text-base-content group-hover:text-primary">{label}</span>
                <span className="text-sm text-base-content/70">{description}</span>
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-xl font-semibold text-base-content">Frequently asked questions</h2>
        <ul className="mt-4 space-y-6">
          {FAQ.map(({ q, a }, i) => (
            <li key={i} className="rounded-xl border border-base-300/70 bg-base-100 p-4 sm:p-5">
              <h3 className="font-semibold text-base-content">{q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-base-content/85">{a}</p>
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-xl font-semibold text-base-content">Contact</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          For technical issues, partnerships, or feedback, email us directly at{" "}
          <a href="mailto:chancedesire60@gmail.com" className="link link-primary">
            chancedesire60@gmail.com
          </a>
          . You can also find updates on{" "}
          <a href="https://vaultictrust.com" target="_blank" rel="noreferrer" className="link link-primary">
            vaultictrust.com
          </a>
          . We do not provide support through unofficial accounts. Verify links before sharing wallet details.
        </p>

        <DocArticleFooter>
          <Link href="/" className="btn btn-primary gap-2 rounded-xl">
            Back to home
          </Link>
          <Link href="/terms" className="btn btn-outline rounded-xl border-base-content/20">
            Terms of Service
          </Link>
          <Link href="/privacy" className="btn btn-ghost rounded-xl">
            Privacy Policy
          </Link>
        </DocArticleFooter>
      </article>
    </div>
  );
};

export default SupportPage;
