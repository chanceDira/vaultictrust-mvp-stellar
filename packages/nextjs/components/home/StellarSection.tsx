import type { ReactElement } from "react";
import { SectionHeading } from "~~/components/home/SectionHeading";

export function StellarSection(): ReactElement {
  return (
    <section className="border-t border-base-300/80 px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <SectionHeading title="Why Stellar" />
        <div className="space-y-4 text-base font-medium leading-relaxed text-base-content/75">
          <p>
            A payment settles in a few seconds and costs a fraction of a cent, so buying a handful of shares still makes
            sense. Prices, payments, and yield are all in USDC.
          </p>
          <p>
            Shares are ordinary Stellar assets. Before your wallet can hold one, you add a trustline, which means shares
            cannot land in an account that did not ask for them.
          </p>
          <p>Your wallet signs every step. VTrust Africa never sees your keys and does not hold funds for you.</p>
        </div>
      </div>
    </section>
  );
}
