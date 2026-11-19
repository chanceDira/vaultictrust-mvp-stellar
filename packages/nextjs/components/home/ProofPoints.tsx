import type { ComponentType, ReactElement, SVGProps } from "react";
import Link from "next/link";
import {
  CodeBracketIcon,
  DocumentCheckIcon,
  ExclamationTriangleIcon,
  ListBulletIcon,
  LockClosedIcon,
  ReceiptPercentIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { SectionHeading } from "~~/components/home/SectionHeading";

type ProofPoint = {
  title: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const POINTS: ProofPoint[] = [
  {
    title: "Reviewed before listing",
    description: "An asset stays pending until a reviewer approves it. Pending assets never reach the marketplace.",
    icon: ShieldCheckIcon,
  },
  {
    title: "Documents you can verify",
    description: "Each public file shows its SHA-256 hash. When you open it, the page checks the bytes match.",
    icon: DocumentCheckIcon,
  },
  {
    title: "Contracts in the open",
    description: "Every contract address the app calls is published, with a link to Stellar Expert.",
    icon: CodeBracketIcon,
  },
  {
    title: "Fees read from the contract",
    description: "The rate comes from the sales contract, and the buy screen quotes it before your wallet opens.",
    icon: ReceiptPercentIcon,
  },
  {
    title: "Identity stays private",
    description: "Your ID is encrypted in your browser. The chain stores a reference, never the document.",
    icon: LockClosedIcon,
  },
  {
    title: "Every sale on record",
    description: "Purchases, yield, and resales on each listing come from chain events, not from a form we fill in.",
    icon: ListBulletIcon,
  },
];

export function ProofPoints(): ReactElement {
  return (
    <section className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
      <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SectionHeading label="Built to be checked" title="Trust you can verify, not just read about">
            We would rather show you the record than ask you to take our word for it. Here is what you can check
            yourself, on every listing.
          </SectionHeading>
          <div className="mt-8 flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4">
            <ExclamationTriangleIcon className="h-6 w-6 shrink-0 text-warning" aria-hidden />
            <p className="text-sm font-semibold leading-relaxed text-base-content/80">
              The contracts are not audited yet, and a listing review is not an audit. Read the{" "}
              <Link href="/risks" className="font-bold text-primary hover:underline">
                risks
              </Link>{" "}
              before you buy.
            </p>
          </div>
          <Link href="/trust" className="btn btn-outline mt-6 rounded-xl border-base-content/15 px-6 font-bold">
            How trust works
          </Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {POINTS.map(({ title, description, icon: Icon }) => (
            <li key={title} className="rounded-3xl border border-base-300 bg-base-100 p-6">
              <Icon className="h-7 w-7 text-primary" aria-hidden />
              <h3 className="mt-4 text-lg font-bold text-base-content">{title}</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-base-content/75">{description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
