import type { ReactElement } from "react";
import Link from "next/link";
import { SectionHeading } from "~~/components/home/SectionHeading";
import { DefinitionRows } from "~~/components/ui/DefinitionRows";

const POINTS = [
  {
    title: "The review",
    description: "An asset stays pending, and off the marketplace, until a reviewer approves it.",
  },
  {
    title: "The documents",
    description: "Each public file shows its SHA-256 hash, and the page checks the bytes when you open it.",
  },
  {
    title: "The contracts",
    description: "Every contract address the app calls is published with a link to Stellar Expert.",
  },
  {
    title: "The fee",
    description: "The rate is read from the sales contract and quoted before your wallet opens.",
  },
  {
    title: "Your identity",
    description: "Your ID is encrypted in your browser. The chain stores a reference, not the document.",
  },
  {
    title: "The sales",
    description: "Purchases, yield, and resales on a listing come from chain events.",
  },
];

export function ProofPoints(): ReactElement {
  return (
    <section className="border-t border-base-300/80 px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div>
          <SectionHeading title="What you can check yourself">
            You should not have to take our word for any of this.
          </SectionHeading>
          <p className="mt-4 max-w-md text-sm font-medium leading-relaxed text-base-content/70">
            The contracts are not audited yet, and a listing review is not an audit. Read the{" "}
            <Link href="/risks" className="font-semibold text-primary hover:underline">
              risks
            </Link>{" "}
            before you buy, or see{" "}
            <Link href="/trust" className="font-semibold text-primary hover:underline">
              how trust works
            </Link>
            .
          </p>
        </div>
        <DefinitionRows rows={POINTS} />
      </div>
    </section>
  );
}
