import { describe, expect, it } from "vitest";
import type { OnChainAsset } from "~~/types/stellar";
import { formatCount, summarizeOpenListings } from "~~/utils/vaultic/liveTotals";

function asset(patch: Partial<OnChainAsset>): OnChainAsset {
  return {
    asset_id: 1,
    asset_name: "Plot",
    asset_category: "Land",
    asset_code: "PLOT",
    asset_owner: "GCBWGQS24DUWG3HNCIFVICSJQXUTNGRKY7OZ4IZGBJSLK3MYHBY7HWHI",
    state: { tag: "Tokenized" },
    model: { tag: "Fractional" },
    valuation: 0n,
    total_shares: 100n,
    price_per_share: 100_000_000n,
    sold_shares: 10n,
    metadata_uri: "ipfs://bafy",
    registered_at: 0n,
    issuer: null,
    ...patch,
  };
}

describe("summarizeOpenListings", () => {
  it("sums open listings, shares sold, and the USDC those shares raised", () => {
    const totals = summarizeOpenListings([
      asset({ asset_id: 1, sold_shares: 10n, price_per_share: 100_000_000n }),
      asset({ asset_id: 2, state: { tag: "Active" }, sold_shares: 4n, price_per_share: 50_000_000n }),
      asset({ asset_id: 3, state: { tag: "Closed" }, sold_shares: 80n }),
    ]);

    expect(totals).toEqual({
      openListings: 2,
      sharesSold: 10n,
      usdcRaised: 1_000_000_000n,
    });
  });

  it("returns a real zero when nothing is open", () => {
    expect(summarizeOpenListings([asset({ state: { tag: "Pending" } })])).toEqual({
      openListings: 0,
      sharesSold: 0n,
      usdcRaised: 0n,
    });
  });

  it("drops the figures when a tokenized price cannot be trusted", () => {
    expect(summarizeOpenListings([asset({ price_per_share: -1n })])).toBeNull();
  });
});

describe("formatCount", () => {
  it("groups digits without converting a large count through a number", () => {
    expect(formatCount(1_000_000_000_000_000_000n)).toBe("1,000,000,000,000,000,000");
  });
});
