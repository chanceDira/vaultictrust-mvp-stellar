import type { ReactElement } from "react";
import Link from "next/link";
import { SectionHeading } from "~~/components/home/SectionHeading";

type JourneyStep = {
  actor: string;
  title: string;
  description: string;
};

const STEPS: JourneyStep[] = [
  {
    actor: "Owner",
    title: "Submits the asset",
    description:
      "Name, location, valuation, a photo, and the public documents, plus whether to sell shares or the whole asset.",
  },
  {
    actor: "VTrust Africa",
    title: "Reviews it",
    description: "Approves it or asks for changes. Nothing can be bought before this.",
  },
  {
    actor: "VTrust Africa",
    title: "Issues the shares",
    description: "Sets the number of shares and the price of each. A whole-asset listing goes on sale as one piece.",
  },
  {
    actor: "Investor",
    title: "Verifies once",
    description: "Uploads an ID, encrypted in the browser. The wallet is then marked verified on chain.",
  },
  {
    actor: "Investor",
    title: "Buys shares",
    description: "Adds a trustline, sees the price and the fee, and signs. The shares are recorded to that wallet.",
  },
  {
    actor: "Owner and holders",
    title: "Yield and resale",
    description:
      "The owner deposits yield in USDC and holders claim it. A holder can offer shares to another investor.",
  },
];

export function JourneyTimeline(): ReactElement {
  return (
    <section className="border-t border-base-300/80 px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading title="How a listing works">
          Each step is signed by the wallet taking it, and each one leaves a public record.
        </SectionHeading>
        <ol className="mt-8 divide-y divide-base-300 border-y border-base-300">
          {STEPS.map((step, index) => (
            <li key={step.title} className="grid gap-1 py-4 sm:grid-cols-[2.5rem_12rem_minmax(0,1fr)] sm:gap-4">
              <span className="text-sm font-semibold tabular-nums text-base-content/40 sm:pt-0.5">{index + 1}</span>
              <div>
                <p className="font-bold text-base-content">{step.title}</p>
                <p className="text-xs font-semibold text-base-content/50">{step.actor}</p>
              </div>
              <p className="text-sm font-medium leading-relaxed text-base-content/75 sm:text-base">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
        <Link href="/how-it-works" className="mt-5 inline-block text-sm font-semibold text-primary hover:underline">
          Read the full guide
        </Link>
      </div>
    </section>
  );
}
