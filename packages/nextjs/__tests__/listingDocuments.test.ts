import { describe, expect, it } from "vitest";
import { readListingDocuments } from "~~/utils/vaultic/listingDocument";
import { sha256Hex } from "~~/utils/vaultic/sha256";

const HASH = "a".repeat(64);

describe("readListingDocuments", () => {
  it("keeps a public file and drops a record that is not a listing file", () => {
    expect(
      readListingDocuments([
        {
          name: " Title.pdf ",
          cid: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          sha256: HASH,
          addedAt: "2026-11-12T00:00:00.000Z",
        },
        { name: "notes", cid: "https://example.com/file", sha256: HASH, addedAt: "2026-11-12T00:00:00.000Z" },
      ]),
    ).toEqual([
      {
        name: "Title.pdf",
        cid: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
        sha256: HASH,
        addedAt: "2026-11-12T00:00:00.000Z",
      },
    ]);
  });

  it("returns an empty list when there are no files", () => {
    expect(readListingDocuments(undefined)).toEqual([]);
  });
});

describe("sha256Hex", () => {
  it("hashes the file bytes", async () => {
    const hash = await sha256Hex(new TextEncoder().encode("vtrust"));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe(await sha256Hex(new TextEncoder().encode("other")));
  });
});
