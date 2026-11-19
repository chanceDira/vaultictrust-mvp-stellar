export type TrustTopic = {
  id: string;
  title: string;
  paragraphs: string[];
};

export const TRUST_TOPICS: TrustTopic[] = [
  {
    id: "review",
    title: "Every listing is reviewed",
    paragraphs: [
      "An owner's submission is stored on chain as pending. It cannot be bought, and it does not appear on the marketplace.",
      "A VTrust Africa reviewer reads the submission and its documents, then approves it or asks for changes. Only an approved asset can be issued as shares or offered whole.",
      "A review is not a legal opinion, and it is not an audit of the contracts.",
    ],
  },
  {
    id: "identity",
    title: "Your identity stays private",
    paragraphs: [
      "Your ID is encrypted in your browser with the review team's public key before it leaves your device. Only the encrypted file is uploaded.",
      "The identity registry on chain stores your status and a reference to that encrypted file. It never stores the document or your name.",
      "The sales contract checks that registry before it accepts a payment, so only verified wallets can buy.",
    ],
  },
  {
    id: "documents",
    title: "Documents you can check yourself",
    paragraphs: [
      "Each public file on a listing, such as a title deed, a valuation, or extra photos, is listed with its SHA-256 hash.",
      "The hash is computed again when the file is uploaded, and again when you open it. If the bytes do not match, the page tells you.",
      "Files are stored on IPFS. We keep a copy of the public files so a slow gateway does not hide them from you.",
    ],
  },
  {
    id: "money",
    title: "Where your USDC goes",
    paragraphs: [
      "When you buy, USDC moves from your wallet to the sales contract. The protocol fee is set aside for the treasury, and the rest waits for the owner to withdraw it.",
      "When an owner pays yield, the USDC goes into the yield contract. Each holder claims their own part from the portfolio page.",
      "Admins can pause new purchases if something goes wrong. Yield claims keep working while purchases are paused.",
    ],
  },
  {
    id: "records",
    title: "The chain is the record",
    paragraphs: [
      "Listings, share sales, yield, and ownership live in the contracts. Listing details and public files live on IPFS.",
      "Our database keeps a copy of public data so pages still load when the network is slow. It is never treated as the source of truth, and it never holds identity documents in plain text.",
      "If a figure cannot be read, the page says it is unavailable. We do not fill the gap with a guess.",
    ],
  },
];

export const TRUST_LIMITS = [
  "The contracts are not audited yet.",
  "Buying shares or a whole asset does not by itself transfer legal title.",
  "Share prices can fall, and you can lose money.",
  "The site does not offer a bank on-ramp, escrow, or custody.",
];
