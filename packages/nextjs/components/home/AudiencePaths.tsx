import type { ReactElement } from "react";
import { AudienceColumn } from "~~/components/home/AudienceColumn";

const INVESTOR_POINTS = [
  "Buy one share or many at the listed share price.",
  "Pay in USDC from your own Stellar wallet.",
  "Read the listing documents and check each file against its hash.",
  "Claim yield from your portfolio when the owner pays out.",
  "Offer your shares to another verified investor when you want out.",
];

const OWNER_POINTS = [
  "Submit the asset from your wallet with its documents and valuation.",
  "Sell it as shares to many investors, or whole to one buyer.",
  "Withdraw sale proceeds in USDC as shares sell.",
  "Pay yield to every holder with a single deposit.",
];

export function AudiencePaths(): ReactElement {
  return (
    <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
      <div className="mx-auto grid w-full max-w-7xl gap-12 md:grid-cols-2 md:gap-16">
        <AudienceColumn
          title="For investors"
          intro="Hold a share of an asset that earns, in your own wallet."
          points={INVESTOR_POINTS}
          linkLabel="Browse listings"
          linkHref="/marketplace"
        />
        <AudienceColumn
          title="For asset owners"
          intro="Raise money from many investors without selling the asset to one buyer."
          points={OWNER_POINTS}
          linkLabel="How listing works"
          linkHref="/how-it-works#owners"
        />
      </div>
    </section>
  );
}
