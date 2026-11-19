import type { ReactElement } from "react";
import { SectionHeading } from "~~/components/home/SectionHeading";
import vaulticConfig from "~~/scaffold.config";

const LIVE = [
  "Submitting and reviewing assets",
  "Buying shares or a whole asset in USDC",
  "Identity checks with encrypted documents",
  "Yield deposits and claims",
  "Share offers between verified investors",
  "Documents and sale history on every listing",
];

const NOT_YET = ["Mainnet with real USDC", "More countries", "More kinds of asset"];

function liveTitle(): string {
  return vaulticConfig.targetNetwork === "testnet" ? "Working on testnet" : "Working now";
}

export function RoadmapSection(): ReactElement {
  return (
    <section className="border-t border-base-300/80 px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading title="Where things stand" />
        <div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <h3 className="text-sm font-bold text-base-content">{liveTitle()}</h3>
            <ul className="mt-3 divide-y divide-base-300 border-y border-base-300">
              {LIVE.map(item => (
                <li key={item} className="py-3 text-sm font-medium text-base-content/80 sm:text-base">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-base-content">Not yet</h3>
            <ul className="mt-3 divide-y divide-base-300 border-y border-base-300">
              {NOT_YET.map(item => (
                <li key={item} className="py-3 text-sm font-medium text-base-content/80 sm:text-base">
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm font-medium leading-relaxed text-base-content/65">
              VTrust Africa does not offer a bank on-ramp, escrow, or custody. You fund your wallet with USDC yourself.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
