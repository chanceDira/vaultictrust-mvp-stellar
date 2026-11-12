import { describe, expect, it } from "vitest";
import type { ChainEventInput } from "~~/utils/vaultic/chainActivity";
import { decodeChainEvent, poolRecordFromNative, userCopyFromRecord } from "~~/utils/vaultic/chainActivity";

const TX_HASH = "ab".repeat(32);
const CONTRACT = "CAUISC56SF5EFPLV33KRXWWU63JU7UATLKTMQVEEVONJPGTSZMITESWB";
const BUYER = "GCBWGQS24DUWG3HNCIFVICSJQXUTNGRKY7OZ4IZGBJSLK3MYHBY7HWHI";
const SELLER = "GBWAF6C56BDHNNUDY2KLC5HFZPGXBZAFE7YKZC36GZYMI2B5QH2M3NCL";

function chainEvent(topics: unknown[], value: unknown): ChainEventInput {
  return {
    eventId: "000100-0001",
    txHash: TX_HASH,
    contractId: CONTRACT,
    ledger: 1_200,
    ledgerClosedAt: "2026-11-12T12:00:00Z",
    topics,
    value,
  };
}

describe("decodeChainEvent", () => {
  it("records a share purchase with the gross amount and the fee inside it", () => {
    const record = decodeChainEvent(chainEvent(["buy_sh", 4, BUYER], [10n, 1_000_000_000n, 5_000_000n]));
    expect(record?.kind).toBe("buy_sh");
    expect(record?.assetId).toBe(4);
    expect(record?.account).toBe(BUYER);
    expect(record?.amount).toBe("10");
    expect(record?.amountSecondary).toBe("1000000000");
    expect(record?.amountTertiary).toBe("5000000");
  });

  it("records a whole-asset purchase and a planned share resale", () => {
    const whole = decodeChainEvent(chainEvent(["buy_whl", 2, BUYER], [50_000_000_000n, 250_000_000n]));
    expect(whole?.amount).toBe("50000000000");
    expect(whole?.amountSecondary).toBe("250000000");
    expect(whole?.amountTertiary).toBeNull();

    const resale = decodeChainEvent(chainEvent(["sell_sh", 4, SELLER, BUYER], [2n, 200_000_000n, 1_000_000n]));
    expect(resale?.account).toBe(SELLER);
    expect(resale?.counterparty).toBe(BUYER);
    expect(resale?.amount).toBe("2");
    expect(resale?.amountSecondary).toBe("200000000");
    expect(resale?.amountTertiary).toBe("1000000");
  });

  it("keeps an unknown event and a yield claim without inventing a round", () => {
    const claim = decodeChainEvent(chainEvent(["yld_all", 4, BUYER], 15_000_000n));
    expect(claim?.kind).toBe("yld_all");
    expect(claim?.amount).toBe("15000000");
    expect(claim?.payload).not.toHaveProperty("round");

    const future = decodeChainEvent(chainEvent(["future"], "note"));
    expect(future?.kind).toBe("future");
    expect(future?.amount).toBeNull();
  });

  it("rejects a transaction hash that is not 64 hex characters", () => {
    expect(decodeChainEvent({ ...chainEvent(["sweep"], 1n), txHash: "abc" })).toBeNull();
  });

  it("does not copy an applicant name from a user record", () => {
    const copy = userCopyFromRecord({
      address: BUYER,
      status: { tag: "Verified" },
      metadata_uri: "ipfs://cid",
      commitment: [1, 255],
      updated_at: 20n,
      fullName: "Amina Diallo",
    });
    expect(copy).toEqual({
      account: BUYER,
      status: "Verified",
      metadataUri: "ipfs://cid",
      commitment: "01ff",
      updatedAt: "20",
    });
    expect(JSON.stringify(copy)).not.toContain("Amina");
  });
});

describe("poolRecordFromNative", () => {
  it("keeps pool amounts as stroop strings", () => {
    const pool = poolRecordFromNative(4, {
      total_shares: 100n,
      sold_shares: 0n,
      price_per_share: 10_000_000n,
      investor_cap: 25n,
      rwa_issuer: SELLER,
      rwa_asset_code: "PLOT",
      is_fully_subscribed: false,
      proceeds_collected: 0n,
      proceeds_withdrawn: 0n,
    });
    expect(pool?.soldShares).toBe("0");
    expect(pool?.pricePerShare).toBe("10000000");
    expect(pool?.rwaIssuer).toBe(SELLER);
  });
});
