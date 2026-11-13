import { describe, expect, it } from "vitest";
import { countShareHolders, readAccountPage, readHolderChartBody } from "~~/utils/vaultic/holderCount";

const ISSUER = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

describe("holderCount", () => {
  it("counts accounts with a positive balance and ignores a zero trustline", () => {
    expect(
      countShareHolders(
        [
          {
            balances: [
              { assetCode: "XLM", assetIssuer: null, balance: "5" },
              { assetCode: "HOME", assetIssuer: ISSUER, balance: "0.0000000" },
            ],
          },
          {
            balances: [{ assetCode: "HOME", assetIssuer: ISSUER, balance: "2.5000000" }],
          },
          {
            balances: [
              {
                assetCode: "HOME",
                assetIssuer: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
                balance: "9",
              },
            ],
          },
        ],
        "HOME",
        ISSUER,
      ),
    ).toBe(1);
  });

  it("rejects a balance that is not a plain number", () => {
    expect(
      countShareHolders([{ balances: [{ assetCode: "HOME", assetIssuer: ISSUER, balance: "1e2" }] }], "HOME", ISSUER),
    ).toBeNull();
  });

  it("reads a horizon page and a chart body", () => {
    expect(
      readAccountPage({
        _embedded: { records: [{ balances: [{ asset_code: "HOME", asset_issuer: ISSUER, balance: "1" }] }] },
        _links: { next: { href: "https://horizon-testnet.stellar.org/accounts?cursor=1" } },
      })?.accounts,
    ).toHaveLength(1);
    expect(
      readHolderChartBody({ skipped: false, truncated: false, rows: [{ capturedOn: "2026-11-13", holderCount: 4 }] }),
    ).toEqual({ skipped: false, truncated: false, rows: [{ capturedOn: "2026-11-13", holderCount: 4 }] });
    expect(
      readHolderChartBody({ skipped: false, truncated: false, rows: [{ capturedOn: "2026-11-13", holderCount: -1 }] }),
    ).toBeNull();
  });
});
