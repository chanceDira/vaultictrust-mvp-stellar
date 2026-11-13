const BALANCE = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const HOLDER_CHART_LIMIT = 120;

export type HolderBalance = {
  assetCode: string | null;
  assetIssuer: string | null;
  balance: string | null;
};

export type HolderAccount = {
  balances: readonly HolderBalance[];
};

export type HolderPoint = {
  capturedOn: string;
  holderCount: number;
};

export type HolderChartBody = {
  skipped: boolean;
  rows: HolderPoint[];
  truncated: boolean;
};

function balanceIsPositive(balance: string | null): boolean | null {
  if (balance === null || !BALANCE.test(balance)) return null;
  const [whole, fraction = ""] = balance.split(".");
  return BigInt(whole) > 0n || /[1-9]/.test(fraction);
}

export function countShareHolders(accounts: readonly HolderAccount[], code: string, issuer: string): number | null {
  let holders = 0;
  for (const account of accounts) {
    let holdsThisAsset = false;
    for (const row of account.balances) {
      if (row.assetCode !== code || row.assetIssuer !== issuer) continue;
      const positive = balanceIsPositive(row.balance);
      if (positive === null) return null;
      if (positive) holdsThisAsset = true;
    }
    if (holdsThisAsset) holders += 1;
  }
  return holders;
}

export function readAccountPage(value: unknown): { accounts: HolderAccount[]; next: string | null } | null {
  if (!value || typeof value !== "object") return null;
  const body = value as {
    _embedded?: { records?: unknown };
    _links?: { next?: { href?: unknown } };
  };
  if (!Array.isArray(body._embedded?.records)) return null;
  const accounts: HolderAccount[] = [];
  for (const record of body._embedded.records) {
    if (!record || typeof record !== "object") return null;
    const balances = (record as { balances?: unknown }).balances;
    if (!Array.isArray(balances)) return null;
    const parsed: HolderBalance[] = [];
    for (const entry of balances) {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      parsed.push({
        assetCode: typeof row.asset_code === "string" ? row.asset_code : null,
        assetIssuer: typeof row.asset_issuer === "string" ? row.asset_issuer : null,
        balance: typeof row.balance === "string" ? row.balance : null,
      });
    }
    accounts.push({ balances: parsed });
  }
  const href = body._links?.next?.href;
  return { accounts, next: typeof href === "string" && href.length > 0 ? href : null };
}

export function readHolderChartBody(value: unknown): HolderChartBody | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (typeof body.skipped !== "boolean" || typeof body.truncated !== "boolean" || !Array.isArray(body.rows)) {
    return null;
  }
  const rows: HolderPoint[] = [];
  for (const entry of body.rows) {
    if (!entry || typeof entry !== "object") return null;
    const row = entry as Record<string, unknown>;
    if (typeof row.capturedOn !== "string" || !DAY.test(row.capturedOn)) return null;
    if (typeof row.holderCount !== "number" || !Number.isInteger(row.holderCount) || row.holderCount < 0) return null;
    rows.push({ capturedOn: row.capturedOn, holderCount: row.holderCount });
  }
  return { skipped: body.skipped, truncated: body.truncated, rows };
}

export function holderChartLimit(): number {
  return HOLDER_CHART_LIMIT;
}
