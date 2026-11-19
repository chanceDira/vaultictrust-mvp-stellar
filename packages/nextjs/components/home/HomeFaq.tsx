import type { ReactElement } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { FaqList } from "~~/components/home/FaqList";
import { SectionHeading } from "~~/components/home/SectionHeading";
import { featuredFaqEntries } from "~~/utils/vaultic/faqEntries";

export function HomeFaq(): ReactElement {
  return (
    <section className="border-t border-base-300/80 bg-base-200/50 px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
      <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div>
          <SectionHeading label="Questions" title="What people ask first">
            Short answers to the questions we hear most. The full list covers buying, owning, listing, and privacy.
          </SectionHeading>
          <Link
            href="/faq"
            className="btn btn-ghost mt-6 gap-2 rounded-xl px-0 font-bold text-primary hover:bg-transparent"
          >
            See every question
            <ArrowRightIcon className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <FaqList entries={featuredFaqEntries()} />
      </div>
    </section>
  );
}
