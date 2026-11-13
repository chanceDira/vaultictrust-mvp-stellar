import { describe, expect, it } from "vitest";
import type { ActivityFeedRow } from "~~/utils/vaultic/activityFeed";
import { payoutSeries, salesSeries } from "~~/utils/vaultic/listingSeries";

function row(overrides: Partial<ActivityFeedRow>): ActivityFeedRow {
  return {
    eventId: "1",
    ledger: 1,
    occurredAt: "2026-11-01T12:00:00.000Z",
    kind: "buy_sh",
    label: "Share purchase",
    assetId: 4,
    account: null,
    counterparty: null,
    shares: "10",
    usdcStroops: "100000000",
    feeStroops: "500000",
    txHash: "a".repeat(64),
    ...overrides,
  };
}

describe("listingSeries", () => {
  it("sums share sales and whole-asset sales by day", () => {
    const series = salesSeries([
      row({ eventId: "late", occurredAt: "2026-11-02T01:00:00.000Z", shares: "5", usdcStroops: "50000000" }),
      row({ eventId: "early", shares: "10", usdcStroops: "100000000" }),
      row({ eventId: "whole", kind: "buy_whl", shares: null, usdcStroops: "200000000", feeStroops: "1000000" }),
      row({ eventId: "resale", kind: "sell_sh", shares: "9", usdcStroops: "90000000" }),
      row({ eventId: "nodate", occurredAt: null, shares: "2", usdcStroops: "20000000" }),
    ]);

    expect(series.points).toEqual([
      { day: "2026-11-01", shares: 10n, usdc: 300_000_000n },
      { day: "2026-11-02", shares: 5n, usdc: 50_000_000n },
    ]);
    expect(series.undatedShares).toBe(2n);
    expect(series.undatedUsdc).toBe(20_000_000n);
  });

  it("keeps yield deposited apart from yield claimed", () => {
    const series = payoutSeries([
      row({ kind: "yld_dep", shares: null, usdcStroops: "15000000", feeStroops: null }),
      row({ kind: "yld_clm", shares: null, usdcStroops: "5000000", feeStroops: null }),
      row({ kind: "buy_sh" }),
    ]);

    expect(series.points).toEqual([{ day: "2026-11-01", deposited: 15_000_000n, claimed: 5_000_000n }]);
  });
});
