export type FaqEntry = {
  question: string;
  answer: string;
  featured?: boolean;
};

export type FaqGroup = {
  title: string;
  entries: FaqEntry[];
};

export const FAQ_GROUPS: FaqGroup[] = [
  {
    title: "Getting started",
    entries: [
      {
        question: "What is VTrust Africa?",
        answer:
          "A marketplace for shares in real assets from Rwanda and across Africa. An owner lists a building, a farm, a mine, or another asset. After a review, verified investors buy shares and pay in USDC on the Stellar network.",
        featured: true,
      },
      {
        question: "Is it live?",
        answer:
          "It runs on Stellar testnet today. Testnet USDC has no value, so you can try every step without risking money. Mainnet is next. Join early access to hear when it opens.",
        featured: true,
      },
      {
        question: "Do I need an account?",
        answer:
          "No email signup. You connect a Stellar wallet such as xBull, LOBSTR, Albedo, or Hana. Your holdings are tied to that wallet's public key.",
      },
      {
        question: "What do I need before I buy?",
        answer:
          "A Stellar wallet, 2 to 3 XLM for network reserves, USDC for the purchase, and a one-time identity check. The how-it-works page walks through each step.",
      },
    ],
  },
  {
    title: "Buying shares",
    entries: [
      {
        question: "Why do I have to verify my identity?",
        answer:
          "The sales contract checks the identity registry before it accepts USDC. A wallet that is not verified cannot buy. Your documents are encrypted in your browser before upload, and only the review team can open them.",
        featured: true,
      },
      {
        question: "What is a trustline?",
        answer:
          "On Stellar, a wallet has to agree to hold an asset before it can receive it. That agreement is a trustline. Your wallet asks you to add one the first time you buy a share, once per asset.",
      },
      {
        question: "What does it cost?",
        answer:
          "A protocol fee is taken from each purchase and kept for the treasury. The current rate is read from the contract and shown on the fees page. The buy screen shows the fee before your wallet opens.",
        featured: true,
      },
      {
        question: "Can I buy a whole asset?",
        answer:
          "Some listings are sold as one asset to one buyer. The buyer becomes the owner in the registry and can list the asset again, as one asset or as shares. Buying it does not by itself transfer legal title.",
      },
    ],
  },
  {
    title: "Owning shares",
    entries: [
      {
        question: "How do I earn from a share?",
        answer:
          "When the owner deposits yield in USDC, each holder can claim their part from the portfolio page. Your part follows the number of shares you hold.",
        featured: true,
      },
      {
        question: "Can I sell my shares?",
        answer:
          "You can offer your shares to one verified investor at a price you set. The buyer signs the purchase in their wallet. It is not an exchange. An offer lasts about 30 days, and you can cancel it and offer again.",
      },
      {
        question: "Does a share give me legal title?",
        answer:
          "No, not by itself. Read the documents in the listing and the risks page before you buy. Share prices can fall, and you can lose money.",
      },
    ],
  },
  {
    title: "Listing an asset",
    entries: [
      {
        question: "Who can list an asset?",
        answer:
          "Any owner with a Stellar wallet can submit one from the assets page. It stays pending and hidden from the marketplace until VTrust Africa reviews it.",
        featured: true,
      },
      {
        question: "What kinds of asset can I submit?",
        answer:
          "Real estate, agriculture, mining, infrastructure, and commodities. You add a name, a location, a valuation in USDC, a photo, and the public documents that describe the asset.",
      },
      {
        question: "How do I get paid?",
        answer:
          "Share sales pay USDC into the sales contract, minus the protocol fee. You withdraw those proceeds to your wallet from the assets page. You can also pay yield to every holder with one deposit.",
      },
    ],
  },
  {
    title: "Safety and privacy",
    entries: [
      {
        question: "Does VTrust Africa hold my money?",
        answer:
          "No. Your wallet signs every payment, and VTrust Africa never sees your keys. The site does not offer a bank on-ramp, escrow, or custody. You fund your wallet with USDC yourself.",
      },
      {
        question: "Are the contracts audited?",
        answer:
          "Not yet. A listing review is not an audit of the contracts. The risks page lists every contract address so you can check what the app calls.",
      },
      {
        question: "What happens to my identity documents?",
        answer:
          "They are encrypted in your browser before they leave it. The chain stores a reference, not the document. Plaintext never touches our servers, IPFS, or our database.",
      },
    ],
  },
];

export function featuredFaqEntries(): FaqEntry[] {
  return FAQ_GROUPS.flatMap(group => group.entries.filter(entry => entry.featured));
}
