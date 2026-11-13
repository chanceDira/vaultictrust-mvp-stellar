"use client";

import type { ReactElement } from "react";
import { useYieldDepositNotes } from "~~/hooks/vaultic/useYieldDepositNotes";
import type { HeldAssetRef } from "~~/utils/vaultic/yieldDepositNote";

type YieldDepositNotesProps = {
  holdings: readonly HeldAssetRef[];
  holdingsLoading: boolean;
};

function depositDate(occurredAt: string | null): string | null {
  if (!occurredAt) return null;
  const time = Date.parse(occurredAt);
  if (!Number.isFinite(time)) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(time);
}

function depositSentence(assetCode: string, occurredAt: string | null): string {
  const date = depositDate(occurredAt);
  if (!date) return `The owner deposited yield for ${assetCode}. The date is unavailable.`;
  return `The owner deposited yield for ${assetCode} on ${date}.`;
}

export function YieldDepositNotes({ holdings, holdingsLoading }: YieldDepositNotesProps): ReactElement | null {
  const { notes, loading, unavailable } = useYieldDepositNotes(holdingsLoading ? [] : holdings);
  if (holdingsLoading || holdings.length === 0) return null;
  if (loading) {
    return <p className="text-sm font-medium text-base-content/60">Loading yield deposits</p>;
  }
  if (unavailable) {
    return <p className="text-sm font-medium text-base-content/70">Yield deposits are unavailable right now.</p>;
  }
  if (notes.length === 0) {
    return <p className="text-sm font-medium text-base-content/60">No yield deposit is recorded for your shares.</p>;
  }

  return (
    <section className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-base-content">Yield deposited</h2>
      <div className="mt-3 space-y-2">
        {notes.map(note => (
          <p key={note.assetId} className="text-sm font-medium text-base-content/80">
            {depositSentence(note.assetCode, note.occurredAt)}
          </p>
        ))}
      </div>
    </section>
  );
}
