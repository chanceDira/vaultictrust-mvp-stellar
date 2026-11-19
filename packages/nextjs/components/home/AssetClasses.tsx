import type { ComponentType, ReactElement, SVGProps } from "react";
import {
  ArchiveBoxIcon,
  BoltIcon,
  BuildingOffice2Icon,
  CubeTransparentIcon,
  SunIcon,
} from "@heroicons/react/24/outline";
import { SectionHeading } from "~~/components/home/SectionHeading";

type AssetClass = {
  name: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  examples?: string[];
  wide?: boolean;
};

const CLASSES: AssetClass[] = [
  {
    name: "Real estate",
    description:
      "Apartments, offices, hotels, and venues. Rent and other income can be paid to holders as yield in USDC.",
    icon: BuildingOffice2Icon,
    examples: ["Apartments", "Offices", "Hotels", "Venues"],
    wide: true,
  },
  {
    name: "Agriculture",
    description: "Farms, plantations, and the sites that process what they grow.",
    icon: SunIcon,
  },
  {
    name: "Mining",
    description: "Mining sites and the equipment that works them.",
    icon: CubeTransparentIcon,
  },
  {
    name: "Infrastructure",
    description: "Energy, transport, and other projects that earn fees from the people who use them.",
    icon: BoltIcon,
  },
  {
    name: "Commodities",
    description: "Stored goods such as coffee, tea, or metals, held by the owner who lists them.",
    icon: ArchiveBoxIcon,
  },
];

export function AssetClasses(): ReactElement {
  return (
    <section className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading label="What you can own" title="Assets that already earn, split into shares">
          These are the categories an owner can choose when they submit an asset. The marketplace shows what is open
          right now.
        </SectionHeading>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CLASSES.map(({ name, description, icon: Icon, examples, wide }) => (
            <li
              key={name}
              className={`group flex flex-col justify-between rounded-3xl border border-base-300 bg-base-100 p-6 transition-colors hover:border-primary/40 ${
                wide ? "bg-gradient-to-br from-primary/15 via-base-100 to-base-100 sm:col-span-2 lg:row-span-2" : ""
              }`}
            >
              <span
                className={`flex items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-content ${
                  wide ? "h-16 w-16" : "h-12 w-12"
                }`}
              >
                <Icon className={wide ? "h-8 w-8" : "h-6 w-6"} aria-hidden />
              </span>
              <div className={wide ? "mt-10 lg:mt-24" : "mt-8"}>
                <h3 className={`font-bold text-base-content ${wide ? "text-2xl sm:text-3xl" : "text-lg"}`}>{name}</h3>
                <p
                  className={`mt-2 font-medium leading-relaxed text-base-content/75 ${wide ? "text-base" : "text-sm"}`}
                >
                  {description}
                </p>
                {examples ? (
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {examples.map(example => (
                      <li
                        key={example}
                        className="rounded-full border border-primary/25 bg-base-100/80 px-3 py-1 text-xs font-bold text-base-content/80"
                      >
                        {example}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
