const STROOPS_PER_USDC = 10_000_000n;

export const FEE_BPS_DENOMINATOR = 10_000n;
export const MAX_PROTOCOL_FEE_BPS = 1_000n;
export const EXAMPLE_SHARE_COUNT = 10n;
export const EXAMPLE_SHARE_PRICE_STROOPS = 100_000_000n;

const PROTOCOL_FEE_KEY = "ProtocolFeeBps";

export type FeeExample = {
  shareCount: bigint;
  priceStroops: bigint;
  grossStroops: bigint;
  feeStroops: bigint;
  totalStroops: bigint;
};

export function protocolFee(grossStroops: bigint, feeBps: bigint): bigint {
  return (grossStroops * feeBps) / FEE_BPS_DENOMINATOR;
}

export function feeExample(feeBps: bigint): FeeExample {
  const grossStroops = EXAMPLE_SHARE_COUNT * EXAMPLE_SHARE_PRICE_STROOPS;
  const feeStroops = protocolFee(grossStroops, feeBps);
  return {
    shareCount: EXAMPLE_SHARE_COUNT,
    priceStroops: EXAMPLE_SHARE_PRICE_STROOPS,
    grossStroops,
    feeStroops,
    totalStroops: grossStroops,
  };
}

export function formatFeePercent(feeBps: bigint): string {
  const whole = feeBps / 100n;
  const fraction = (feeBps % 100n).toString().padStart(2, "0").replace(/0+$/, "");
  const body = fraction.length > 0 ? `${whole.toString()}.${fraction}` : whole.toString();
  return `${body}%`;
}

export function formatUsdcAmount(stroops: bigint): string {
  const negative = stroops < 0n;
  const absolute = negative ? -stroops : stroops;
  const whole = absolute / STROOPS_PER_USDC;
  const remainder = (absolute % STROOPS_PER_USDC).toString().padStart(7, "0").replace(/0+$/, "");
  const fraction = remainder.padEnd(2, "0").slice(0, Math.max(2, remainder.length));
  const body = `${whole.toString()}.${fraction}`;
  return negative ? `-${body}` : body;
}

function plain(value: unknown): unknown {
  if (value && typeof value === "object" && typeof (value as { toJSON?: unknown }).toJSON === "function") {
    return (value as { toJSON: () => unknown }).toJSON();
  }
  return value;
}

function symbolName(value: unknown): string | null {
  const data = plain(value);
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.length === 1 ? symbolName(data[0]) : null;
  if (!data || typeof data !== "object") return null;
  const record = data as { symbol?: unknown; vec?: unknown };
  if (typeof record.symbol === "string") return record.symbol;
  if (Array.isArray(record.vec) || (record.vec && typeof record.vec === "object")) return symbolName(record.vec);
  return null;
}

function readI128(value: unknown): bigint | null {
  const data = plain(value);
  if (typeof data === "bigint") return data;
  if (typeof data === "number" && Number.isInteger(data)) return BigInt(data);
  if (typeof data === "string" && /^-?\d+$/.test(data)) return BigInt(data);
  if (data && typeof data === "object" && "i128" in data) {
    return readI128((data as { i128: unknown }).i128);
  }
  return null;
}

const STELLAR_ACCOUNT = /^[GC][A-Z2-7]{55}$/;

function findInstanceValue(instance: unknown, key: string): unknown | undefined {
  if (!instance || typeof instance !== "object" || !("storage" in instance)) return undefined;
  const storage = (instance as { storage?: unknown }).storage;
  if (!Array.isArray(storage)) return undefined;

  for (const entry of storage) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as { key?: unknown; val?: unknown };
    if (symbolName(row.key) === key) return row.val;
  }
  return undefined;
}

function readAddressValue(value: unknown): string | null {
  const data = plain(value);
  if (typeof data === "string" && STELLAR_ACCOUNT.test(data)) return data;
  if (data && typeof data === "object" && "address" in data) {
    return readAddressValue((data as { address: unknown }).address);
  }
  return null;
}

export function readInstanceI128(instance: unknown, key: string): bigint | null {
  const value = findInstanceValue(instance, key);
  if (value === undefined) return null;
  return readI128(value);
}

export function readInstanceAddress(instance: unknown, key: string): string | null {
  const value = findInstanceValue(instance, key);
  if (value === undefined) return null;
  return readAddressValue(value);
}

export function parseProtocolFeeBps(instance: unknown): bigint | null {
  const feeBps = readInstanceI128(instance, PROTOCOL_FEE_KEY);
  if (feeBps === null || feeBps < 0n || feeBps > MAX_PROTOCOL_FEE_BPS) return null;
  return feeBps;
}
