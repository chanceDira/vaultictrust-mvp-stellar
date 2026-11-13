import { describe, expect, it } from "vitest";
import { yieldDepositNotes } from "~~/utils/vaultic/yieldDepositNote";

describe("yieldDepositNotes", () => {
  it("keeps the later deposit for a held asset and ignores the rest", () => {
    expect(
      yieldDepositNotes(
        [
          { assetId: 4, assetCode: "HOME" },
          { assetId: 9, assetCode: "LAND" },
        ],
        [
          { assetId: 4, occurredAt: "2026-11-01T00:00:00.000Z", ledger: 10 },
          { assetId: 4, occurredAt: "2026-11-12T00:00:00.000Z", ledger: 8 },
          { assetId: 2, occurredAt: "2026-11-13T00:00:00.000Z", ledger: 30 },
        ],
      ),
    ).toEqual([{ assetId: 4, assetCode: "HOME", occurredAt: "2026-11-12T00:00:00.000Z" }]);
  });
});
