import { describe, expect, it } from "vitest";
import { buildActivityCsv, decodeActivity, formatActivityAmount, formatStroops } from "~~/utils/vaultic/activityRecord";

const ACCOUNT = "GCBWGQS24DUWG3HNCIFVICSJQXUTNGRKY7OZ4IZGBJSLK3MYHBY7HWHI";

describe("decodeActivity", () => {
  it("reads a share purchase once, with shares, gross USDC, and fee", () => {
    const decoded = decodeActivity(["buy_sh", 16, ACCOUNT], [2n, 20_000_000n, 200_000n]);
    expect(decoded).toMatchObject({
      kind: "share_purchase",
      assetId: 16,
      account: ACCOUNT,
      shares: 2n,
      usdcStroops: 20_000_000n,
      feeStroops: 200_000n,
    });
    if (!decoded) throw new Error("expected a share purchase");
    expect(formatActivityAmount(decoded)).toBe("2 shares · 20 USDC");
  });

  it("reads a whole-asset purchase and a yield claim", () => {
    expect(decodeActivity(["buy_whl", 4, ACCOUNT], [100_000_0000n, 10_000_0000n])).toMatchObject({
      kind: "whole_asset",
      shares: null,
      usdcStroops: 100_000_0000n,
      feeStroops: 10_000_0000n,
    });
    expect(decodeActivity(["yld_clm", 4, ACCOUNT], 1_500_000n)?.kind).toBe("yield_claim");
    expect(decodeActivity(["yld_all", 4, ACCOUNT], 1_500_000n)?.kind).toBe("yield_claim");
  });

  it("drops a topic that is not an activity event", () => {
    expect(decodeActivity(["kyc_sub", 1, ACCOUNT], 1n)).toBeNull();
    expect(decodeActivity(["buy_sh", 1], [1n, 1n, 1n])).toBeNull();
  });
});

describe("buildActivityCsv", () => {
  it("matches the feed amounts and leaves a missing fee blank", () => {
    const csv = buildActivityCsv([
      {
        id: "1",
        ledgerClosedAt: "2026-11-12T13:20:00.000Z",
        assetId: 16,
        assetCode: "VTRICH",
        kind: "share_purchase",
        account: ACCOUNT,
        shares: 2n,
        usdcStroops: 20_000_000n,
        feeStroops: 200_000n,
        txHash: "abc123",
      },
      {
        id: "2",
        ledgerClosedAt: "2026-11-12T13:21:00.000Z",
        assetId: 4,
        assetCode: null,
        kind: "yield_claim",
        account: ACCOUNT,
        shares: null,
        usdcStroops: 1_500_000n,
        feeStroops: null,
        txHash: "def456",
      },
    ]);
    expect(csv).toBe(
      [
        "date,asset,kind,shares,usdc,fee,transaction",
        "2026-11-12T13:20:00.000Z,VTRICH,Share purchase,2,20,0.02,abc123",
        "2026-11-12T13:21:00.000Z,#4,Yield claimed,,0.15,,def456",
        "",
      ].join("\n"),
    );
  });
});

describe("formatStroops", () => {
  it("keeps a one-stroop amount", () => {
    expect(formatStroops(1n)).toBe("0.0000001");
  });
});
