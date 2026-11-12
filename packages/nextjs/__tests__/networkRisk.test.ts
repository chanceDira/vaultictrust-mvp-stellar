import { describe, expect, it } from "vitest";
import { networkRiskLine } from "~~/utils/vaultic/networkRisk";

describe("networkRiskLine", () => {
  it("names testnet and keeps that balance off mainnet", () => {
    expect(networkRiskLine("testnet")).toBe(
      "This app is on Stellar Testnet. A balance on this network is not a mainnet balance.",
    );
  });

  it("names mainnet and keeps a testnet balance off it", () => {
    expect(networkRiskLine("mainnet")).toBe(
      "This app is on Stellar Mainnet. A testnet balance is not a balance on this network.",
    );
  });
});
