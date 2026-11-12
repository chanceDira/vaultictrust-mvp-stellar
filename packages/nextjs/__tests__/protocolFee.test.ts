import { describe, expect, it } from "vitest";
import {
  feeExample,
  formatFeePercent,
  formatUsdcAmount,
  parseProtocolFeeBps,
  parsePurchasesPaused,
  protocolFee,
  readInstanceAddress,
  readInstanceI128,
} from "~~/utils/vaultic/protocolFee";

const LIVE_INSTANCE = {
  storage: [
    { key: { vec: [{ symbol: "AccumulatedFees" }] }, val: { i128: "10250000" } },
    { key: { vec: [{ symbol: "ProtocolFeeBps" }] }, val: { i128: "50" } },
  ],
};

describe("parseProtocolFeeBps", () => {
  it("reads the instance entry and rejects a rate above the contract maximum", () => {
    expect(parseProtocolFeeBps(LIVE_INSTANCE)).toBe(50n);
    expect(
      parseProtocolFeeBps({
        storage: [
          {
            key: { toJSON: () => ({ vec: [{ symbol: "ProtocolFeeBps" }] }) },
            val: { toJSON: () => ({ i128: "50" }) },
          },
        ],
      }),
    ).toBe(50n);
    expect(
      parseProtocolFeeBps({
        storage: [{ key: { vec: [{ symbol: "ProtocolFeeBps" }] }, val: { i128: "1001" } }],
      }),
    ).toBeNull();
    expect(parseProtocolFeeBps({ storage: [] })).toBeNull();
  });
});

describe("feeExample", () => {
  it("charges the live 50 bps rate inside a 100 USDC purchase", () => {
    const example = feeExample(50n);
    expect(example.grossStroops).toBe(1_000_000_000n);
    expect(example.feeStroops).toBe(protocolFee(example.grossStroops, 50n));
    expect(example.feeStroops).toBe(5_000_000n);
    expect(example.totalStroops).toBe(example.grossStroops);
    expect(formatFeePercent(50n)).toBe("0.5%");
    expect(formatUsdcAmount(example.feeStroops)).toBe("0.50");
    expect(formatUsdcAmount(example.totalStroops)).toBe("100.00");
  });
});

describe("instance fields", () => {
  it("reads the fee treasury and accumulated fees from instance storage", () => {
    const treasury = "GCBWGQS24DUWG3HNCIFVICSJQXUTNGRKY7OZ4IZGBJSLK3MYHBY7HWHI";
    const instance = {
      storage: [
        { key: { vec: [{ symbol: "FeeTreasury" }] }, val: { address: treasury } },
        { key: { vec: [{ symbol: "AccumulatedFees" }] }, val: { i128: "10250000" } },
      ],
    };
    expect(readInstanceAddress(instance, "FeeTreasury")).toBe(treasury);
    expect(readInstanceI128(instance, "AccumulatedFees")).toBe(10_250_000n);
    expect(readInstanceAddress(instance, "Missing")).toBeNull();
  });

  it("treats a missing pause flag as open and reads a stored flag", () => {
    expect(parsePurchasesPaused({ storage: [] })).toBe(false);
    expect(
      parsePurchasesPaused({
        storage: [{ key: { vec: [{ symbol: "PurchasesPaused" }] }, val: { bool: true } }],
      }),
    ).toBe(true);
    expect(
      parsePurchasesPaused({
        storage: [{ key: { vec: [{ symbol: "PurchasesPaused" }] }, val: { bool: "yes" } }],
      }),
    ).toBeNull();
  });
});
