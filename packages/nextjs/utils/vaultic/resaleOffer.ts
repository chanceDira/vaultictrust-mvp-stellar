import { protocolFee } from "~~/utils/vaultic/protocolFee";

const STELLAR_ACCOUNT = /^[GC][A-Z2-7]{55}$/;
const WHOLE_USDC = /^(?:0|[1-9]\d*)$/;
const USDC_TEXT = /^(?:0|[1-9]\d*)(?:\.\d{1,7})?$/;
const STROOPS_PER_USDC = 10_000_000n;
const STROOP_DECIMALS = 7;

export type ResaleOffer = {
  seller: string;
  shares: bigint;
  priceStroops: bigint;
};

export type ResaleQuote = {
  gross: bigint;
  fee: bigint;
  net: bigint;
};

function readI128(value: unknown): bigint | null {
  if (typeof value === "bigint" && value >= 0n) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  if (typeof value === "string" && WHOLE_USDC.test(value)) return BigInt(value);
  return null;
}

export function parseSellerList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const sellers: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string" || !STELLAR_ACCOUNT.test(entry)) return null;
    sellers.push(entry);
  }
  return sellers;
}

export function parseResaleOffer(seller: string, value: unknown): ResaleOffer | null {
  if (!STELLAR_ACCOUNT.test(seller) || !value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const shares = readI128(record.shares);
  const priceStroops = readI128(record.price_per_share ?? record.pricePerShare);
  if (shares === null || priceStroops === null || shares <= 0n || priceStroops <= 0n) return null;
  return { seller, shares, priceStroops };
}

export function usdcToStroops(text: string): bigint | null {
  const trimmed = text.trim();
  if (!USDC_TEXT.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  const stroops = BigInt(whole) * STROOPS_PER_USDC + BigInt(fraction.padEnd(STROOP_DECIMALS, "0"));
  return stroops > 0n ? stroops : null;
}

export function shareCount(text: string): bigint | null {
  const trimmed = text.trim();
  if (!WHOLE_USDC.test(trimmed)) return null;
  const count = BigInt(trimmed);
  return count > 0n ? count : null;
}

export function resaleQuote(shares: bigint, priceStroops: bigint, feeBps: bigint): ResaleQuote | null {
  if (shares <= 0n || priceStroops <= 0n || feeBps < 0n) return null;
  const gross = shares * priceStroops;
  const fee = protocolFee(gross, feeBps);
  return { gross, fee, net: gross - fee };
}
