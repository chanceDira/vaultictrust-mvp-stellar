import type { ReactElement } from "react";
import Link from "next/link";

export function MissionSection(): ReactElement {
  return (
    <section className="border-t border-base-300/80 bg-base-200/40 px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
      <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-2 lg:gap-16">
        <blockquote className="text-2xl font-bold leading-snug tracking-tight text-base-content sm:text-3xl">
          A building in Kigali is usually sold whole. We think more people should be able to own part of it.
        </blockquote>
        <div className="space-y-4 text-base font-medium leading-relaxed text-base-content/75">
          <p>
            Across Africa, real assets change hands in large blocks. Buying in takes a lot of money, paperwork, and
            people you trust on the ground. Most savers are left out, and so are many Africans abroad who want to invest
            at home.
          </p>
          <p>
            Owners have the other half of the problem. A hotel or a farm can be worth a great deal and still be hard to
            raise money against without selling all of it.
          </p>
          <p>
            VTrust Africa lets an owner sell shares to verified investors, with the listing, its documents, and every
            purchase on a public record. We are starting in Rwanda.
          </p>
          <Link href="/about" className="inline-block text-sm font-semibold text-primary hover:underline">
            About VTrust Africa
          </Link>
        </div>
      </div>
    </section>
  );
}
