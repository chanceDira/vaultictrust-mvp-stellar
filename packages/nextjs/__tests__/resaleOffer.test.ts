import { describe, expect, it } from "vitest";
import {
  parseResaleOffer,
  parseSellerList,
  resaleQuote,
  shareCount,
  usdcToStroops,
} from "~~/utils/vaultic/resaleOffer";

const SELLER = "GBWAF6C56BDHNNUDY2KLC5HFZPGXBZAFE7YKZC36GZYMI2B5QH2M3NCL";

describe("resaleOffer", () => {
  it("reads a share offer and rejects a zero price", () => {
    expect(parseResaleOffer(SELLER, { shares: 40n, price_per_share: 100_000_000n })).toEqual({
      seller: SELLER,
      shares: 40n,
      priceStroops: 100_000_000n,
    });
    expect(parseResaleOffer(SELLER, { shares: "40", price_per_share: "0" })).toBeNull();
    expect(parseSellerList([SELLER])).toEqual([SELLER]);
    expect(parseSellerList(["not-an-account"])).toBeNull();
  });

  it("quotes the protocol fee from the offer price", () => {
    expect(usdcToStroops("10.50")).toBe(105_000_000n);
    expect(usdcToStroops("0")).toBeNull();
    expect(shareCount("12")).toBe(12n);
    expect(resaleQuote(10n, 100_000_000n, 50n)).toEqual({
      gross: 1_000_000_000n,
      fee: 5_000_000n,
      net: 995_000_000n,
    });
  });
});
