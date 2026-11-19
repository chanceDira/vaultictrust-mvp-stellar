import Link from "next/link";
import type { NextPage } from "next";
import { SectionHeading } from "~~/components/home/SectionHeading";
import { DefinitionRows } from "~~/components/ui/DefinitionRows";
import { PageIntro } from "~~/components/ui/PageIntro";
import vaulticConfig, { EARLY_ACCESS_FORM_URL } from "~~/scaffold.config";
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

function statusText(): string {
  if (vaulticConfig.targetNetwork === "testnet") {
    return "The full flow runs on Stellar testnet today: listing, review, purchases, yield, and share offers. Mainnet is next. The contracts are not audited yet, and the risks page says so plainly.";
  }
  return "Listing, review, purchases, yield, and share offers are live. The contracts are not audited yet, and the risks page says so plainly.";
}

const AboutPage: NextPage = () => {
  return (
    <div className="flex min-h-0 flex-col">
      <PageIntro
        title="Opening up ownership of Africa's real assets"
        lede="We are building a marketplace where an owner can split a real asset into shares, and anyone who passes an identity check can buy a piece of it with USDC."
      />

      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-2 lg:gap-20">
          <SectionHeading title="Real assets, held by too few people" />
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

      <section className="border-y border-base-300/80 bg-base-200/40 px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto w-full max-w-7xl">
          <SectionHeading title="How we build" />
          <div className="mt-8">
            <DefinitionRows rows={PRINCIPLES} />
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-base-content">Where things stand</h2>
            <p className="mt-3 text-base font-medium leading-relaxed text-base-content/75">{statusText()}</p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
              <Link href="/litepaper" className="text-primary hover:underline">
                Read the litepaper
              </Link>
              <Link href="/risks" className="text-primary hover:underline">
                Risks
              </Link>
              <a
                href={EARLY_ACCESS_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Get early access
              </a>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-base-content">Talk to the team</h2>
            <p className="mt-3 text-base font-medium leading-relaxed text-base-content/75">
              Own an asset you would like to list, want to partner, or found a problem? Write to the team inbox at{" "}
              <a href="mailto:chancedesire60@gmail.com" className="font-semibold text-primary hover:underline">
                chancedesire60@gmail.com
              </a>
              . We do not offer support through unofficial accounts.
            </p>
            <Link href="/support" className="mt-5 inline-block text-sm font-semibold text-primary hover:underline">
              Visit support
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
