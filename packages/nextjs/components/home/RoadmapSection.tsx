import type { ReactElement } from "react";
import { SectionHeading } from "~~/components/home/SectionHeading";
import vaulticConfig from "~~/scaffold.config";

type RoadmapColumn = {
  stage: string;
  title: string;
  items: string[];
  tone: string;
};

const COLUMNS: RoadmapColumn[] = [
  {
    stage: "Live now",
    title: vaulticConfig.targetNetwork === "testnet" ? "On Stellar testnet" : "On Stellar",
    items: [
      "Submit and review assets",
      "Buy shares or a whole asset in USDC",
      "Identity check with encrypted documents",
      "Yield deposits and claims",
      "Share offers between verified investors",
      "Document room and sale history on every listing",
    ],
    tone: "border-success/40 bg-success/5",
  },
  {
    stage: "Next",
    title: "Mainnet",
    items: ["Launch on Stellar mainnet with real USDC", "Open to the first owners and investors from early access"],
    tone: "border-primary/40 bg-primary/5",
  },
  {
    stage: "Later",
    title: "Wider reach",
    items: ["More countries across Africa", "More kinds of asset"],
    tone: "border-base-300 bg-base-100",
  },
  {
    stage: "Not offered",
    title: "What we do not do",
    items: [
      "No bank on-ramp. You fund your wallet with USDC yourself.",
      "No escrow",
      "No custody of your funds or keys",
    ],
    tone: "border-dashed border-base-content/20 bg-base-100",
  },
];

export function RoadmapSection(): ReactElement {
  return (
    <section className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading label="Where we are" title="What works today, and what comes next">
          We would rather tell you plainly what is live than promise everything at once.
        </SectionHeading>
        <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map(column => (
            <li key={column.stage} className={`flex flex-col rounded-3xl border p-6 ${column.tone}`}>
              <p className="text-xs font-bold text-primary">{column.stage}</p>
              <h3 className="mt-1 text-xl font-bold text-base-content">{column.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {column.items.map(item => (
                  <li key={item} className="flex gap-2 text-sm font-medium leading-relaxed text-base-content/80">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
