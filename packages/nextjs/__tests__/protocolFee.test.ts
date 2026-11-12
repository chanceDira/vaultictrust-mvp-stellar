import { describe, expect, it } from "vitest";
import {
  feeExample,
  formatFeePercent,
  formatUsdcAmount,
  parseProtocolFeeBps,
  protocolFee,
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
