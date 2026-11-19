import Link from "next/link";
import type { NextPage } from "next";
import { EnvelopeIcon } from "@heroicons/react/24/outline";
import { SectionHeading } from "~~/components/home/SectionHeading";
import { PageIntro } from "~~/components/ui/PageIntro";
import { EARLY_ACCESS_FORM_URL } from "~~/scaffold.config";
import { getMetadata } from "~~/utils/vaultic/getMetadata";

export const metadata = getMetadata({
  title: "About",
  description: "Why VTrust Africa exists, what we believe, and how to reach the team.",
});

const PRINCIPLES = [
  {
    title: "Show what is real",
    description:
      "Every figure on the site is read from the contracts or the public record. If we cannot read a number, we leave it blank instead of guessing.",
  },
  {
    title: "Your wallet, your keys",
    description:
      "You sign every purchase, claim, and listing yourself. We never see your keys, and we do not hold money on your behalf.",
  },
  {
    title: "Private by default",
    description:
      "Identity documents are encrypted in your browser before they leave it. Plaintext never reaches our servers, IPFS, or our database.",
  },
  {
    title: "Review before anything is sold",
    description:
      "Every asset is checked before it appears on the marketplace. A pending asset cannot take a single payment.",
  },
  {
    title: "Say it before you sign",
    description:
      "The fee, the total, and the risks are on the screen before your wallet opens. No small print after the fact.",
  },
  {
    title: "Open records",
    description:
      "The chain and IPFS are the source of truth. Our database is a copy that keeps pages loading, never the other way around.",
  },
];

const AboutPage: NextPage = () => {
  return (
    <div className="flex min-h-0 flex-col">
      <PageIntro
        label="About VTrust Africa"
        title="Opening up ownership of Africa's real assets"
        lede="We are building a marketplace where an owner can split a real asset into shares, and anyone who passes an identity check can buy a piece of it with USDC."
      />

      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-2 lg:gap-20">
          <SectionHeading label="Our story" title="Real assets, held by too few people" />
          <div className="space-y-5 text-base font-medium leading-relaxed text-base-content/80 sm:text-lg">
            <p>
              Hotels, farms, stadiums, mines, and office blocks across Africa produce real income. Owning part of one
              usually means buying the whole thing, finding a partner you trust, and working through a stack of
              paperwork in person.
            </p>
            <p>
              That leaves most savers out. It leaves out many Africans abroad who want to put money to work at home and
              cannot check a deal from a distance. It also leaves owners with fewer ways to raise money against what
              they have built.
            </p>
            <p>
              VTrust Africa puts the listing, its documents, and every sale on Stellar, where anyone can read them. An
              owner gets a way to reach many investors at once. An investor gets a share they can hold in their own
              wallet, with yield paid in USDC. We are starting in Rwanda.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-base-300/80 bg-base-200/50 px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto w-full max-w-7xl">
          <SectionHeading label="What we believe" title="Six rules we build by">
            They shape every page and every contract, and they are the reason some features wait until they can be done
            properly.
          </SectionHeading>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRINCIPLES.map((principle, index) => (
              <li key={principle.title} className="rounded-3xl border border-base-300 bg-base-100 p-6">
                <p className="text-sm font-bold text-primary">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-2 text-lg font-bold text-base-content">{principle.title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-base-content/75">{principle.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-base-300 bg-base-100 p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-base-content">Where things stand</h2>
            <p className="mt-3 text-base font-medium leading-relaxed text-base-content/80">
              The full flow runs on Stellar testnet today: listing, review, purchases, yield, and share offers. Mainnet
              is next. The contracts are not audited yet, and the risks page says so plainly.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/litepaper" className="btn btn-primary btn-sm rounded-xl px-5">
                Read the litepaper
              </Link>
              <Link href="/risks" className="btn btn-outline btn-sm rounded-xl border-base-content/15 px-5">
                Risks
              </Link>
              <a
                href={EARLY_ACCESS_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm rounded-xl px-5 text-primary"
              >
                Get early access
              </a>
            </div>
          </article>
          <article className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-base-100 to-base-100 p-6 sm:p-8">
            <EnvelopeIcon className="h-8 w-8 text-primary" aria-hidden />
            <h2 className="mt-4 text-2xl font-bold text-base-content">Talk to the team</h2>
            <p className="mt-3 text-base font-medium leading-relaxed text-base-content/80">
              Own an asset you would like to list, want to partner, or found a problem? Write to the team inbox at{" "}
              <a href="mailto:chancedesire60@gmail.com" className="font-bold text-primary hover:underline">
                chancedesire60@gmail.com
              </a>
              . We do not offer support through unofficial accounts.
            </p>
            <Link
              href="/support"
              className="btn btn-ghost btn-sm mt-5 rounded-xl px-0 text-primary hover:bg-transparent"
            >
              Visit support
            </Link>
          </article>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
