import type { ReactElement } from "react";
import Link from "next/link";
import { FaqList } from "~~/components/home/FaqList";
import { SectionHeading } from "~~/components/home/SectionHeading";
import { featuredFaqEntries } from "~~/utils/vaultic/faqEntries";

export function HomeFaq(): ReactElement {
  return (
    <section className="border-t border-base-300/80 bg-base-200/40 px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div>
          <SectionHeading title="Common questions" />
          <Link href="/faq" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
            All questions
          </Link>
        </div>
        <FaqList entries={featuredFaqEntries()} />
      </div>
    </section>
  );
}
