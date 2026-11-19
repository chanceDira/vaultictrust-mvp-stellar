import Link from "next/link";
import type { NextPage } from "next";
import { ContractDirectory } from "~~/components/contracts/ContractDirectory";
import { SectionHeading } from "~~/components/home/SectionHeading";
import { PageIntro } from "~~/components/ui/PageIntro";
import vaulticConfig from "~~/scaffold.config";
import { publishedAddresses, publishedNetworkName } from "~~/utils/vaultic/contractDirectory";
import { getMetadata } from "~~/utils/vaultic/getMetadata";
import { TRUST_LIMITS, TRUST_TOPICS } from "~~/utils/vaultic/trustContent";

const networkId = vaulticConfig.targetNetwork;
const networkName = publishedNetworkName(networkId);
const entries = publishedAddresses(networkId);

export const metadata = getMetadata({
  title: "How trust works",
  description:
    "How VTrust Africa reviews listings, protects identity documents, lets you check every file, and where your USDC goes.",
});

const TrustPage: NextPage = () => {
  return (
    <div className="flex min-h-0 flex-col">
      <PageIntro
        title="How trust works"
        lede="What we check before a listing goes live, what you can check yourself, and what we will not do."
      />

      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
          <nav className="hidden lg:sticky lg:top-24 lg:block lg:self-start" aria-label="On this page">
            <p className="text-sm font-bold text-base-content">On this page</p>
            <ul className="mt-3 space-y-2 border-l border-base-300">
              {TRUST_TOPICS.map(topic => (
                <li key={topic.id}>
                  <a
                    href={`#${topic.id}`}
                    className="-ml-px block border-l border-transparent pl-4 text-sm font-semibold text-base-content/65 hover:border-primary hover:text-primary"
                  >
                    {topic.title}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#contracts"
                  className="-ml-px block border-l border-transparent pl-4 text-sm font-semibold text-base-content/65 hover:border-primary hover:text-primary"
                >
                  The contracts
                </a>
              </li>
            </ul>
          </nav>

          <div className="divide-y divide-base-300">
            {TRUST_TOPICS.map(topic => (
              <article key={topic.id} id={topic.id} className="scroll-mt-24 py-8 first:pt-0">
                <h2 className="text-2xl font-bold text-base-content">{topic.title}</h2>
                <div className="mt-4 space-y-3">
                  {topic.paragraphs.map(paragraph => (
                    <p key={paragraph} className="text-base font-medium leading-relaxed text-base-content/75">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
            ))}

            <article id="contracts" className="scroll-mt-24 py-8">
              <h2 className="text-2xl font-bold text-base-content">The contracts</h2>
              <p className="mt-4 text-base font-medium leading-relaxed text-base-content/75">
                These are the addresses this app calls on {networkName}. Copy any of them, or open it on Stellar Expert
                to read its history.
              </p>
              <ContractDirectory entries={entries} />
            </article>
          </div>
        </div>
      </section>

      <section className="border-t border-base-300/80 bg-base-200/40 px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-2 lg:gap-16">
          <SectionHeading title="What you should know before you buy">
            Safeguards reduce risk. They do not remove it.
          </SectionHeading>
          <div>
            <ul className="divide-y divide-base-300 border-y border-base-300">
              {TRUST_LIMITS.map(limit => (
                <li key={limit} className="py-3 text-base font-medium leading-relaxed text-base-content/80">
                  {limit}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/risks" className="btn btn-primary rounded-xl px-6 font-bold">
                Read the risks
              </Link>
              <Link href="/privacy" className="btn btn-ghost rounded-xl px-6 font-bold text-primary">
                Privacy policy
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TrustPage;
