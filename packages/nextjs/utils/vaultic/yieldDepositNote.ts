export type StoredYieldDeposit = {
  assetId: number;
  occurredAt: string | null;
  ledger: number;
};

export type YieldDepositNote = {
  assetId: number;
  assetCode: string;
  occurredAt: string | null;
};

export type HeldAssetRef = {
  assetId: number;
  assetCode: string;
};

function isLater(candidate: StoredYieldDeposit, current: StoredYieldDeposit): boolean {
  if (candidate.occurredAt && current.occurredAt && candidate.occurredAt !== current.occurredAt) {
    return candidate.occurredAt > current.occurredAt;
  }
  if (candidate.occurredAt && !current.occurredAt) return true;
  if (!candidate.occurredAt && current.occurredAt) return false;
  return candidate.ledger >= current.ledger;
}

export function yieldDepositNotes(
  holdings: readonly HeldAssetRef[],
  deposits: readonly StoredYieldDeposit[],
): YieldDepositNote[] {
  const notes: YieldDepositNote[] = [];
  for (const holding of holdings) {
    let latest: StoredYieldDeposit | null = null;
    for (const deposit of deposits) {
      if (deposit.assetId !== holding.assetId) continue;
      if (!latest || isLater(deposit, latest)) latest = deposit;
    }
    if (!latest) continue;
    notes.push({ assetId: holding.assetId, assetCode: holding.assetCode, occurredAt: latest.occurredAt });
  }
  return notes;
}
