import { Networks } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { shareContractId } from "~~/utils/vaultic/shareContract";

describe("shareContractId", () => {
  it("matches the testnet USDC contract", () => {
    expect(shareContractId("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5", Networks.TESTNET)).toBe(
      "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
    );
  });
});
