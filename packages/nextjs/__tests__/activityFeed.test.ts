import { describe, expect, it } from "vitest";
import { activityCsv, activityFeedFromStored, readActivityFeedBody } from "~~/utils/vaultic/activityFeed";

const TX_HASH = "ab".repeat(32);
const BUYER = "GCBWGQS24DUWG3HNCIFVICSJQXUTNGRKY7OZ4IZGBJSLK3MYHBY7HWHI";
const SELLER = "GBWAF6C56BDHNNUDY2KLC5HFZPGXBZAFE7YKZC36GZYMI2B5QH2M3NCL";

function stored(kind: string, amount: string | null, secondary: string | null, tertiary: string | null) {
  return {
    event_id: "000100-0001",
    ledger: 1_200,
    ledger_closed_at: "2026-11-12T12:00:00Z",
    tx_hash: TX_HASH,
    kind,
    asset_id: 4,
    account: kind === "sell_sh" ? SELLER : BUYER,
    counterparty: kind === "sell_sh" || kind === "own_xfr" ? BUYER : null,
    amount,
    amount_secondary: secondary,
    amount_tertiary: tertiary,
  };
}

describe("activityFeedFromStored", () => {
  it("splits a share purchase into shares, gross USDC, and the fee", () => {
    const row = activityFeedFromStored(stored("buy_sh", "10", "1000000000", "5000000"));
    expect(row?.label).toBe("Share purchase");
    expect(row?.shares).toBe("10");
    expect(row?.usdcStroops).toBe("1000000000");
    expect(row?.feeStroops).toBe("5000000");
    expect(row?.occurredAt).toBe("2026-11-12T12:00:00.000Z");
  });

  it("keeps a whole-asset purchase and a yield claim as USDC", () => {
    const whole = activityFeedFromStored(stored("buy_whl", "50000000000", "250000000", null));
    expect(whole?.shares).toBeNull();
    expect(whole?.usdcStroops).toBe("50000000000");
    expect(whole?.feeStroops).toBe("250000000");

    const claim = activityFeedFromStored(stored("yld_all", "15000000", null, null));
    expect(claim?.label).toBe("All yield claimed");
    expect(claim?.usdcStroops).toBe("15000000");
    expect(claim?.feeStroops).toBeNull();
    expect(claim?.shares).toBeNull();
  });

  it("drops an unknown kind and a bad transaction hash", () => {
    expect(activityFeedFromStored(stored("sweep", "1", null, null))).toBeNull();
    expect(activityFeedFromStored({ ...stored("buy_sh", "10", "1", "1"), tx_hash: "abc" })).toBeNull();
  });

  it("keeps a transfer with no amounts and ignores a fractional share count", () => {
    const transfer = activityFeedFromStored({ ...stored("own_xfr", null, null, null), account: SELLER });
    expect(transfer?.label).toBe("Ownership transferred");
    expect(transfer?.account).toBe(SELLER);
    expect(transfer?.counterparty).toBe(BUYER);
    expect(transfer?.usdcStroops).toBeNull();

    const purchase = activityFeedFromStored(stored("buy_sh", "10.5", "1000000000", null));
    expect(purchase?.shares).toBeNull();
    expect(purchase?.usdcStroops).toBe("1000000000");
  });
});

describe("activityCsv", () => {
  it("matches the feed row and leaves a missing fee blank", () => {
    const row = activityFeedFromStored(stored("buy_sh", "10", "1000000000", "5000000"));
    expect(row).not.toBeNull();
    if (!row) return;
    expect(activityCsv([row])).toBe(
      [
        "date,asset,kind,shares,usdc,fee,transaction",
        `2026-11-12T12:00:00.000Z,4,Share purchase,10,100.00,0.50,${TX_HASH}`,
      ].join("\n"),
    );

    const claim = activityFeedFromStored(stored("yld_clm", "15000000", null, null));
    expect(claim).not.toBeNull();
    if (!claim) return;
    expect(activityCsv([claim]).split("\n")[1]).toBe(`2026-11-12T12:00:00.000Z,4,Yield claimed,,1.50,,${TX_HASH}`);
  });
});

describe("readActivityFeedBody", () => {
  it("treats a skipped copy as a body with no rows", () => {
    expect(readActivityFeedBody({ skipped: true, rows: [], truncated: false })).toEqual({
      skipped: true,
      rows: [],
      truncated: false,
    });
    expect(readActivityFeedBody({ rows: [] })).toBeNull();
  });
});
