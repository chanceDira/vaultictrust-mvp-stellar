import type { ReactElement } from "react";
import Link from "next/link";
import { GlobeEuropeAfricaIcon } from "@heroicons/react/24/outline";

const PILLARS = [
  {
    title: "Smaller tickets",
    description: "A share costs a small part of the asset, not the price of the whole building.",
  },
  {
    title: "Records anyone can check",
    description: "Listings, documents, and every sale sit on a public ledger, not in a private spreadsheet.",
  },
  {
    title: "Open beyond borders",
    description: "A verified investor with a Stellar wallet can take part from home or from abroad.",
  },
];

export function MissionSection(): ReactElement {
  return (
    <section className="border-y border-base-300/80 bg-base-200/50 px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
      <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
        <div>
          <p className="text-sm font-bold text-primary">Why we are building this</p>
          <blockquote className="mt-4 text-3xl font-bold leading-tight tracking-tight text-base-content sm:text-4xl">
            A building in Kigali is usually sold whole. We think more people should be able to own part of it.
          </blockquote>
          <div className="mt-8 flex items-center gap-3 text-sm font-semibold text-base-content/70">
            <GlobeEuropeAfricaIcon className="h-6 w-6 text-primary" aria-hidden />
            Starting in Rwanda, building for the whole continent
          </div>
        </div>
        <div className="space-y-5 text-base font-medium leading-relaxed text-base-content/80 sm:text-lg">
          <p>
            Across Africa, real assets change hands in large blocks. Buying in takes a lot of money, a lot of paperwork,
            and people you trust on the ground. Most savers are left out, and so are many Africans living abroad who
            want to invest at home.
          </p>
          <p>
            Owners face the other side of the same problem. A hotel, a farm, or a stadium can be worth a great deal and
            still be hard to raise money against without selling all of it.
          </p>
          <p>
            VTrust Africa lets an owner split an asset into shares and sell them to verified investors. The listing, its
            documents, and every purchase sit on a public record that anyone can open.{" "}
            <Link href="/about" className="font-bold text-primary hover:underline">
              More about us
            </Link>
          </p>
          <ul className="grid gap-4 pt-4 sm:grid-cols-3">
            {PILLARS.map(pillar => (
              <li key={pillar.title} className="border-l-2 border-primary pl-4">
                <p className="text-sm font-bold text-base-content">{pillar.title}</p>
                <p className="mt-1 text-sm font-medium leading-relaxed text-base-content/70">{pillar.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
