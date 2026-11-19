import type { ReactElement } from "react";
import { BuildingOffice2Icon, WalletIcon } from "@heroicons/react/24/outline";
import { AudiencePanel } from "~~/components/home/AudiencePanel";
import { SectionHeading } from "~~/components/home/SectionHeading";

const INVESTOR_POINTS = [
  "Buy one share or many. Each listing has a fixed share price, and you choose how much to put in.",
  "Pay in USDC from your own Stellar wallet. No bank transfer, no paperwork by post.",
  "Open every public document on the listing and check that its hash matches.",
  "Claim yield in USDC from your portfolio when the owner pays out.",
  "Offer your shares to another verified investor when you want to sell.",
];

const OWNER_POINTS = [
  "Submit a building, a farm, a mine, or another asset straight from your wallet.",
  "Sell it as shares to many investors, or as one asset to a single buyer.",
  "Withdraw sale proceeds in USDC whenever shares sell.",
  "Pay yield to every holder with one deposit. The contract works out each share.",
  "Reach investors across Africa and abroad without running your own fundraise.",
];

export function AudiencePaths(): ReactElement {
  return (
    <section className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading label="Two ways in" title="Whether you invest or you own, it starts with a wallet">
          VTrust Africa connects people who own productive assets with people who want a stake in them. Both sides sign
          with their own Stellar wallet, and both see the same public record.
        </SectionHeading>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <AudiencePanel
            icon={WalletIcon}
            audience="For investors"
            title="Own part of something real"
            points={INVESTOR_POINTS}
            primary={{ label: "Browse listings", href: "/marketplace" }}
            secondary={{ label: "Verify your identity", href: "/investor/kyc" }}
            highlighted
          />
          <AudiencePanel
            icon={BuildingOffice2Icon}
            audience="For asset owners"
            title="Raise money from many people at once"
            points={OWNER_POINTS}
            primary={{ label: "List your asset", href: "/owner" }}
            secondary={{ label: "How listing works", href: "/how-it-works#owners" }}
          />
        </div>
      </div>
    </section>
  );
}
