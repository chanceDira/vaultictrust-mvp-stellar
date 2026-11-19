import type { ReactElement } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
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
      "Name, location, valuation, a photo, the public documents, and whether to sell shares or the whole asset. Each file gets a content hash.",
  },
  {
    actor: "VTrust Africa",
    title: "Reviews it",
    description:
      "A reviewer checks the submission and approves it or asks for changes. Nothing is for sale before this.",
  },
  {
    actor: "VTrust Africa",
    title: "Issues the shares",
    description:
      "A share listing is split into a fixed number of shares at a set price. A whole-asset listing goes on sale as one piece.",
  },
  {
    actor: "Investor",
    title: "Verifies once",
    description:
      "The identity document is encrypted in the browser. Once approved, the wallet is marked verified on chain.",
  },
  {
    actor: "Investor",
    title: "Buys shares",
    description:
      "Add a trustline, see the price and the fee, then sign. USDC goes to the sale and the shares are recorded to you.",
  },
  {
    actor: "Both",
    title: "Earn and move on",
    description:
      "The owner deposits yield in USDC and holders claim their part. A holder can offer shares to another investor.",
  },
];

export function JourneyTimeline(): ReactElement {
  return (
    <section className="border-y border-base-300/80 bg-base-200/50 px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading label="How it works" title="From a building to a share in your wallet">
            Six steps, each one signed by the wallet taking it. You can follow every step on the public record.
          </SectionHeading>
          <Link
            href="/how-it-works"
            className="btn btn-outline shrink-0 gap-2 rounded-xl border-base-content/15 px-6 font-bold"
          >
            Read the full guide
            <ArrowRightIcon className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="relative overflow-hidden rounded-3xl border border-base-300 bg-base-100 p-6 transition-colors hover:border-primary/40"
            >
              <span
                className="pointer-events-none absolute -right-2 -top-6 text-8xl font-extrabold text-primary/10"
                aria-hidden
              >
                {index + 1}
              </span>
              <p className="relative text-xs font-bold text-primary">
                Step {index + 1} · {step.actor}
              </p>
              <h3 className="relative mt-2 text-lg font-bold text-base-content">{step.title}</h3>
              <p className="relative mt-2 text-sm font-medium leading-relaxed text-base-content/75">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
