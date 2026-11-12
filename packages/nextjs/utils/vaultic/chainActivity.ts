const STELLAR_ACCOUNT = /^[GC][A-Z2-7]{55}$/;
const TX_HASH = /^[a-fA-F0-9]{64}$/;
const MAX_EVENT_ID_CHARS = 120;
const MAX_KIND_CHARS = 32;
const MAX_PAYLOAD_CHARS = 4_000;
const KYC_STATUSES = ["None", "Pending", "Verified", "Rejected", "Suspended"] as const;

export type ChainEventInput = {
  eventId: string;
  txHash: string;
  contractId: string;
  ledger: number;
  ledgerClosedAt: string;
  topics: unknown[];
  value: unknown;
};

export type ActivityRecord = {
  eventId: string;
  ledger: number;
  ledgerClosedAt: string | null;
  txHash: string;
  contractId: string;
  kind: string;
  assetId: number | null;
  account: string | null;
  counterparty: string | null;
  amount: string | null;
  amountSecondary: string | null;
  amountTertiary: string | null;
  payload: Record<string, unknown>;
};

export type PoolRecord = {
  assetId: number;
  totalShares: string;
  soldShares: string;
  pricePerShare: string;
  investorCap: string;
  rwaIssuer: string | null;
  rwaAssetCode: string;
  isFullySubscribed: boolean;
  proceedsCollected: string;
  proceedsWithdrawn: string;
};

export type UserCopy = {
  account: string;
  status: string;
  metadataUri: string;
  commitment: string;
  updatedAt: string;
};

function readSymbol(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || !("symbol" in value)) return null;
  const symbol = (value as { symbol: unknown }).symbol;
  return typeof symbol === "string" ? symbol : null;
}

function readAccount(value: unknown): string | null {
  if (typeof value === "string" && STELLAR_ACCOUNT.test(value)) return value;
  if (!value || typeof value !== "object" || !("address" in value)) return null;
  return readAccount((value as { address: unknown }).address);
}

function readU32(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 4_294_967_295) return value;
  if (typeof value === "bigint" && value >= 0n && value <= 4_294_967_295n) return Number(value);
  if (typeof value === "string" && /^(?:0|[1-9]\d*)$/.test(value)) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 4_294_967_295) return parsed;
  }
  return null;
}

function readStroop(value: unknown): string | null {
  if (typeof value === "bigint") return value >= 0n ? value.toString() : null;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  if (typeof value === "string" && /^(?:0|[1-9]\d*)$/.test(value)) return value;
  return null;
}

function readStroops(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    const single = readStroop(value);
    return single === null ? null : [single];
  }
  const amounts = value.map(readStroop);
  if (amounts.some(amount => amount === null)) return null;
  return amounts as string[];
}

function readClosedAt(value: string): string | null {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return new Date(time).toISOString();
}

function jsonSafe(value: unknown, depth = 0): unknown {
  if (depth > 6) return null;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }
  if (Array.isArray(value)) return value.slice(0, 12).map(entry => jsonSafe(entry, depth + 1));
  if (value && typeof value === "object") {
    const record: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value).slice(0, 20)) {
      record[key] = jsonSafe(entry, depth + 1);
    }
    return record;
  }
  return null;
}

function payloadFrom(topics: unknown[], value: unknown, extra?: Record<string, unknown>): Record<string, unknown> {
  const payload = {
    topics: jsonSafe(topics),
    value: jsonSafe(value),
    ...extra,
  };
  if (JSON.stringify(payload).length <= MAX_PAYLOAD_CHARS) return payload;
  return extra ?? {};
}

function baseRecord(input: ChainEventInput, kind: string): ActivityRecord {
  return {
    eventId: input.eventId,
    ledger: input.ledger,
    ledgerClosedAt: readClosedAt(input.ledgerClosedAt),
    txHash: input.txHash.toLowerCase(),
    contractId: input.contractId,
    kind,
    assetId: null,
    account: null,
    counterparty: null,
    amount: null,
    amountSecondary: null,
    amountTertiary: null,
    payload: payloadFrom(input.topics, input.value),
  };
}

function withAmounts(record: ActivityRecord, amounts: string[] | null): ActivityRecord {
  if (!amounts) return record;
  return {
    ...record,
    amount: amounts[0] ?? null,
    amountSecondary: amounts[1] ?? null,
    amountTertiary: amounts[2] ?? null,
  };
}

export function decodeChainEvent(input: ChainEventInput): ActivityRecord | null {
  if (input.eventId.length === 0 || input.eventId.length > MAX_EVENT_ID_CHARS) return null;
  if (!TX_HASH.test(input.txHash)) return null;
  if (!STELLAR_ACCOUNT.test(input.contractId)) return null;
  if (!Number.isInteger(input.ledger) || input.ledger < 0) return null;

  const kind = readSymbol(input.topics[0]);
  if (!kind || kind.length > MAX_KIND_CHARS) return null;
  const record = baseRecord(input, kind);
  const assetId = readU32(input.topics[1]);
  const topicAccount = readAccount(input.topics[1]);
  const secondAccount = readAccount(input.topics[2]);
  const thirdAccount = readAccount(input.topics[3]);
  const amounts = readStroops(input.value);

  if (kind === "kyc_sub" || kind === "kyc_upd") {
    const status = kind === "kyc_upd" ? readU32(input.value) : null;
    return {
      ...record,
      account: topicAccount,
      payload: payloadFrom(input.topics, input.value, {
        status: status === null ? null : (KYC_STATUSES[status] ?? null),
      }),
    };
  }

  if (kind === "sell_sh") {
    return withAmounts({ ...record, assetId, account: secondAccount, counterparty: thirdAccount }, amounts);
  }

  if (kind === "buy_sh" || kind === "buy_whl" || kind === "yld_dep" || kind === "yld_clm" || kind === "yld_all") {
    return withAmounts({ ...record, assetId, account: secondAccount }, amounts);
  }

  if (kind === "own_xfr") {
    return { ...record, assetId, account: secondAccount, counterparty: readAccount(input.value) };
  }

  if (kind === "relist") {
    return withAmounts({ ...record, assetId, account: secondAccount }, amounts);
  }

  if (
    kind === "reg_ast" ||
    kind === "tokenized" ||
    kind === "tok_ast" ||
    kind === "withdrw" ||
    kind === "rl_whole" ||
    kind === "rl_frac" ||
    kind === "sold_upd" ||
    kind === "burn_ast"
  ) {
    return withAmounts({ ...record, assetId, account: secondAccount ?? readAccount(input.value) }, amounts);
  }

  if (kind === "aprv_ast" || kind === "cls_ast" || kind === "arch_ast" || kind === "del_ast") {
    return { ...record, assetId, account: readAccount(input.value) };
  }

  if (kind === "sweep" || kind === "tok_upd") {
    return withAmounts({ ...record, account: readAccount(input.value) }, amounts);
  }

  return record;
}

export function poolRecordFromNative(assetId: number, value: unknown): PoolRecord | null {
  if (!Number.isInteger(assetId) || assetId < 0 || !value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const totalShares = readStroop(record.total_shares);
  const soldShares = readStroop(record.sold_shares);
  const pricePerShare = readStroop(record.price_per_share);
  const investorCap = readStroop(record.investor_cap);
  const proceedsCollected = readStroop(record.proceeds_collected);
  const proceedsWithdrawn = readStroop(record.proceeds_withdrawn);
  if (!totalShares || !soldShares || !pricePerShare || !investorCap || !proceedsCollected || !proceedsWithdrawn) {
    return null;
  }
  const assetCode = record.rwa_asset_code;
  return {
    assetId,
    totalShares,
    soldShares,
    pricePerShare,
    investorCap,
    rwaIssuer: readAccount(record.rwa_issuer),
    rwaAssetCode: typeof assetCode === "string" ? assetCode.slice(0, 32) : "",
    isFullySubscribed: record.is_fully_subscribed === true,
    proceedsCollected,
    proceedsWithdrawn,
  };
}

function commitmentText(value: unknown): string {
  if (typeof value === "string" && /^[a-fA-F0-9]{1,128}$/.test(value)) return value.toLowerCase();
  if (!Array.isArray(value) && !(value instanceof Uint8Array)) return "";
  const bytes = Array.from(value);
  if (
    bytes.length === 0 ||
    bytes.length > 64 ||
    bytes.some(byte => typeof byte !== "number" || byte < 0 || byte > 255)
  ) {
    return "";
  }
  return bytes.map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export function userCopyFromRecord(value: unknown): UserCopy | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const account = readAccount(record.address) ?? readAccount(record.account);
  if (!account) return null;
  const statusValue = record.status;
  let status = "";
  if (typeof statusValue === "string" && (KYC_STATUSES as readonly string[]).includes(statusValue))
    status = statusValue;
  if (statusValue && typeof statusValue === "object" && "tag" in statusValue) {
    const tag = (statusValue as { tag: unknown }).tag;
    if (typeof tag === "string" && (KYC_STATUSES as readonly string[]).includes(tag)) status = tag;
  }
  if (typeof statusValue === "number" && KYC_STATUSES[statusValue]) status = KYC_STATUSES[statusValue];
  if (!status) return null;
  const metadataUri = typeof record.metadata_uri === "string" ? record.metadata_uri.slice(0, 200) : "";
  const updated = readStroop(record.updated_at);
  return {
    account,
    status,
    metadataUri,
    commitment: commitmentText(record.commitment),
    updatedAt: updated ?? "0",
  };
}
