import type { ReactElement } from "react";
import { SectionHeading } from "~~/components/home/SectionHeading";

const FACTS = [
  {
    figure: "Seconds",
    title: "to settle",
    description: "A purchase confirms in a few seconds. You see the shares in your portfolio right after.",
  },
  {
    figure: "Cents",
    title: "or less per payment",
    description: "A Stellar transaction costs a fraction of a cent, so small purchases still make sense.",
  },
  {
    figure: "USDC",
    title: "a digital dollar",
    description: "Prices, payments, and yield are all in USDC, so the number you see is the number you pay.",
  },
  {
    figure: "Your keys",
    title: "stay with you",
    description:
      "Your wallet signs every step. VTrust Africa never sees your keys and keeps no custody account for you.",
  },
];

export function WhyStellarBand(): ReactElement {
  return (
    <section className="px-5 py-4 sm:px-8 lg:px-12">
      <div className="relative mx-auto w-full max-w-7xl overflow-hidden rounded-[2rem] bg-primary px-6 py-14 sm:px-10 sm:py-16 lg:px-14">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border-[3rem] border-primary-content/10"
          aria-hidden
        />
        <div className="relative">
          <SectionHeading label="Why Stellar" title="Built on a network made for payments" tone="inverse">
            Shares are ordinary Stellar assets, and your wallet adds a trustline before it can hold one. That is the
            control that keeps shares from landing in an account that did not ask for them.
          </SectionHeading>
          <dl className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FACTS.map(fact => (
              <div key={fact.figure} className="border-t border-primary-content/25 pt-5">
                <dt>
                  <span className="block text-3xl font-extrabold tracking-tight text-primary-content">
                    {fact.figure}
                  </span>
                  <span className="mt-1 block text-sm font-bold text-primary-content/80">{fact.title}</span>
                </dt>
                <dd className="mt-3 text-sm font-medium leading-relaxed text-primary-content/80">{fact.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
