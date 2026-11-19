import Link from "next/link";
import type { NextPage } from "next";
import { FaqList } from "~~/components/home/FaqList";
import { PageIntro } from "~~/components/ui/PageIntro";
import { FAQ_GROUPS } from "~~/utils/vaultic/faqEntries";
import { getMetadata } from "~~/utils/vaultic/getMetadata";

export const metadata = getMetadata({
  title: "FAQ",
  description: "Answers about buying shares, owning them, listing an asset, fees, and privacy on VTrust Africa.",
});

function groupId(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

const FaqPage: NextPage = () => {
  return (
    <div className="flex min-h-0 flex-col">
      <PageIntro
        title="Frequently asked questions"
        lede="If your question is not here, the support page has wallet help and the team inbox."
      />
      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
          <nav className="lg:sticky lg:top-24 lg:self-start" aria-label="Topics">
            <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
              {FAQ_GROUPS.map(group => (
                <li key={group.title}>
                  <a
                    href={`#${groupId(group.title)}`}
                    className="block rounded-xl border border-base-300 px-3 py-1.5 text-sm font-semibold text-base-content/70 hover:border-primary/40 hover:text-primary lg:border-transparent"
                  >
                    {group.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="space-y-12">
            {FAQ_GROUPS.map(group => (
              <section key={group.title} id={groupId(group.title)} className="scroll-mt-24">
                <h2 className="mb-4 text-2xl font-bold text-base-content">{group.title}</h2>
                <FaqList entries={group.entries} />
              </section>
            ))}
            <p className="text-base font-medium leading-relaxed text-base-content/75">
              Still stuck? The{" "}
              <Link href="/support" className="font-semibold text-primary hover:underline">
                support page
              </Link>{" "}
              covers trustline errors and wallet setup, and lists the team inbox.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FaqPage;
