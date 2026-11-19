import type { ReactElement } from "react";
import { SectionHeading } from "~~/components/home/SectionHeading";
import { DefinitionRows } from "~~/components/ui/DefinitionRows";

const CLASSES = [
  { title: "Real estate", description: "Apartments, offices, hotels, and venues." },
  { title: "Agriculture", description: "Farms, plantations, and processing sites." },
  { title: "Mining", description: "Mining sites and the equipment that works them." },
  { title: "Infrastructure", description: "Energy, transport, and other projects that earn fees." },
  { title: "Commodities", description: "Stored goods such as coffee, tea, or metals." },
];

export function AssetClasses(): ReactElement {
  return (
    <section className="border-t border-base-300/80 px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <SectionHeading title="What can be listed">
          The categories an owner picks from when they submit. The marketplace shows what is open today.
        </SectionHeading>
        <DefinitionRows rows={CLASSES} />
      </div>
    </section>
  );
}
