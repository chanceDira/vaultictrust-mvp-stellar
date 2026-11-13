import { describe, expect, it } from "vitest";
import { formatSharePercent, shareSplit } from "~~/utils/vaultic/shareSplit";

describe("shareSplit", () => {
  it("splits sold and remaining shares", () => {
    expect(shareSplit(100n, 40n)).toEqual({
      sold: 40n,
      remaining: 60n,
      total: 100n,
      soldTenths: 400,
      remainingTenths: 600,
    });
    expect(shareSplit(3n, 1n)?.soldTenths).toBe(333);
    expect(shareSplit(3n, 1n)?.remainingTenths).toBe(667);
    expect(formatSharePercent(333, false)).toBe("33.3");
    expect(formatSharePercent(1000, false)).toBe("100");
    expect(formatSharePercent(0, true)).toBe("<0.1");
  });

  it("returns nothing when the counts cannot be a split", () => {
    expect(shareSplit(0n, 0n)).toBeNull();
    expect(shareSplit(10n, 11n)).toBeNull();
    expect(shareSplit(10n, -1n)).toBeNull();
  });
});
