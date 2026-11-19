export type GuideStep = {
  title: string;
  description: string;
  link?: { label: string; href: string };
};

export type GuideNeed = {
  title: string;
  description: string;
};

export const GUIDE_NEEDS: GuideNeed[] = [
  {
    title: "A Stellar wallet",
    description:
      "xBull, LOBSTR, Albedo, Hana, and other Stellar wallets connect from the button at the top of the page.",
  },
  {
    title: "2 to 3 XLM",
    description: "Every trustline locks a small XLM reserve. Keep a little extra so a purchase does not fail.",
  },
  {
    title: "USDC",
    description: "Share prices, payments, and yield are all in USDC. Your wallet needs a USDC trustline to hold it.",
  },
  {
    title: "A verified identity",
    description: "A one-time check before your first purchase. Your document is encrypted in your browser.",
  },
];

export const INVESTOR_STEPS: GuideStep[] = [
  {
    title: "Connect your wallet",
    description:
      "Press Connect at the top of any page and pick your wallet. Your holdings are tied to that wallet's public key. There is no email signup.",
  },
  {
    title: "Verify your identity",
    description:
      "Upload a photo of your ID, passport, or resident card. It is encrypted in your browser before it leaves your device, and only the review team can open it. Once approved, the identity registry marks your wallet as verified.",
    link: { label: "Start verification", href: "/investor/kyc" },
  },
  {
    title: "Pick a listing",
    description:
      "Browse the marketplace. Each listing shows its valuation, share price, how many shares are left, its documents with their content hashes, and the history of past purchases.",
    link: { label: "Browse listings", href: "/marketplace" },
  },
  {
    title: "Add the trustline",
    description:
      "The first time you buy a share, your wallet asks you to trust that share asset. You do this once per asset. It locks a small XLM reserve.",
  },
  {
    title: "Buy your shares",
    description:
      "Choose how many shares you want. The quote shows the shares, the price, the protocol fee, and the total in USDC before your wallet opens. Sign, and the shares are recorded to you in seconds.",
  },
  {
    title: "Follow and claim",
    description:
      "Your portfolio lists every holding, every purchase, and any yield the owner has deposited. Claim your part in USDC, and export your history as a CSV.",
    link: { label: "Open your portfolio", href: "/investor" },
  },
  {
    title: "Sell when you want",
    description:
      "Offer your shares to one verified investor at a price you set. The buyer signs the purchase. An offer lasts about 30 days, and you can cancel it from your portfolio.",
  },
];

export const OWNER_STEPS: GuideStep[] = [
  {
    title: "Connect your wallet",
    description:
      "The wallet you connect becomes the owner of the listing. It signs the submission and receives the proceeds.",
  },
  {
    title: "Submit the asset",
    description:
      "From the assets page, add the name, a share code that starts with VT, the category, the valuation in USDC, the location, a description, a photo, and the public documents a buyer should read.",
    link: { label: "Go to the assets page", href: "/owner" },
  },
  {
    title: "Choose shares or whole",
    description:
      "Sell the asset as shares to many investors, or as one asset to a single buyer. A whole-asset buyer becomes the owner in the registry.",
  },
  {
    title: "Wait for the review",
    description:
      "The listing stays in review and off the marketplace until VTrust Africa approves it. A reviewer can ask for changes first.",
  },
  {
    title: "Shares go on sale",
    description:
      "For a share listing, the reviewer issues a fixed number of shares at a set price, and can cap how many one investor may hold. The listing then opens on the marketplace.",
  },
  {
    title: "Withdraw your proceeds",
    description:
      "Every purchase pays USDC into the sales contract, minus the protocol fee. Withdraw what has built up to your wallet from the assets page.",
  },
  {
    title: "Pay yield to holders",
    description:
      "When the asset earns, deposit USDC once. Each holder claims their part from their portfolio, in line with the shares they hold.",
  },
];

export const SALE_TYPES = [
  {
    title: "Shares",
    points: [
      "Many investors each buy part of the asset.",
      "Each share has a fixed price set when the shares are issued.",
      "Holders can claim yield and offer their shares to another verified investor.",
    ],
  },
  {
    title: "Whole asset",
    points: [
      "One buyer pays the full price.",
      "The buyer becomes the owner in the registry.",
      "They can list it again, as one asset or as shares.",
    ],
  },
];
