import { describe, expect, it } from "vitest";
import type { OnChainAsset } from "~~/types/stellar";
import {
  assetFromListingRow,
  classifyOffchainPayload,
  isListingStorageUrl,
  listingMetadataPayload,
  listingRowFromAsset,
  listingStorageUrl,
  visibleAssetsFromRows,
  withStoredImage,
} from "~~/utils/vaultic/listingCopy";
import { listingFileType } from "~~/utils/vaultic/listingFileType";

const CID = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
const OWNER = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

const LISTING: OnChainAsset = {
  asset_id: 3,
  asset_name: "Plot",
  asset_category: "Real Estate",
  asset_code: "PLOT",
  asset_owner: OWNER,
  state: { tag: "Tokenized" },
  model: { tag: "Fractional" },
  valuation: 1_000_000_000n,
  total_shares: 100n,
  price_per_share: 10_000_000n,
  sold_shares: 10n,
  metadata_uri: `ipfs://${CID}`,
  registered_at: 1_700_000_000n,
  issuer: null,
};

describe("classifyOffchainPayload", () => {
  it("keeps public listing fields and drops nothing private from them", () => {
    const copy = classifyOffchainPayload({
      description: "A field",
      location: "Accra",
      image: `ipfs://${CID}`,
      documents: [
        {
          name: "Title.pdf",
          cid: `ipfs://${CID}`,
          sha256: "a".repeat(64),
          addedAt: "2026-11-01T00:00:00.000Z",
        },
      ],
    });
    expect(copy?.kind).toBe("listing");
    if (copy?.kind !== "listing") return;
    expect(listingMetadataPayload(copy).image).toBe(`ipfs://${CID}`);
    expect(copy.documents).toHaveLength(1);
  });

  it("stores only ciphertext when the package includes an applicant name", () => {
    const copy = classifyOffchainPayload({
      applicant: { fullName: "Amina Diallo", country: "GH" },
      encryptedDocument: { ciphertext: "aabb", iv: "cc", encryptedKey: "dd" },
    });
    expect(copy).toEqual({ kind: "encrypted", ciphertext: "aabb", iv: "cc", encryptedKey: "dd" });
    expect(JSON.stringify(copy)).not.toContain("Amina");
  });

  it("does not keep a name when the document ciphertext is missing", () => {
    expect(classifyOffchainPayload({ applicant: { fullName: "Amina Diallo" } })).toBeNull();
  });
});

describe("listing rows", () => {
  it("round-trips a chain listing through string stroop fields", () => {
    const row = listingRowFromAsset(LISTING);
    const asset = assetFromListingRow(row);
    expect(asset?.valuation).toBe(1_000_000_000n);
    expect(asset?.state.tag).toBe("Tokenized");
    expect(asset?.issuer).toBeNull();
  });

  it("rejects a fractional stroop amount and a negative valuation", () => {
    expect(assetFromListingRow({ ...listingRowFromAsset(LISTING), valuation: "10.5" })).toBeNull();
    expect(listingRowFromAsset({ ...LISTING, valuation: -1n })).toBeNull();
  });

  it("hides pending rows from the public list", () => {
    const row = listingRowFromAsset({ ...LISTING, state: { tag: "Pending" } });
    expect(visibleAssetsFromRows([row])).toEqual([]);
  });
});

describe("stored file urls", () => {
  it("accepts only the public listing-files bucket", () => {
    const url = listingStorageUrl("https://abcd.supabase.co", CID);
    expect(url).toBe(`https://abcd.supabase.co/storage/v1/object/public/listing-files/${CID}`);
    expect(isListingStorageUrl(url ?? "")).toBe(true);
    expect(isListingStorageUrl("https://example.com/storage/v1/object/public/listing-files/x")).toBe(false);
    expect(withStoredImage({ image: `ipfs://${CID}`, description: "A field" }, url).image).toBe(url);
    expect(withStoredImage({ image: `ipfs://${CID}` }, "https://example.com/photo.jpg").image).toBe(`ipfs://${CID}`);
  });
});

describe("listingFileType", () => {
  it("recognizes a jpeg header", () => {
    expect(listingFileType(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg");
    expect(listingFileType(new Uint8Array([0x00, 0x01]))).toBeNull();
  });
});
