import { describe, expect, it } from "vitest";
import { assetListLoading } from "~~/hooks/vaultic/useAssets";

describe("assetListLoading", () => {
  it("stops after a real zero and waits while a page is still loading", () => {
    expect(assetListLoading(undefined, false)).toBe(true);
    expect(assetListLoading(0, false)).toBe(false);
    expect(assetListLoading(4, true)).toBe(true);
    expect(assetListLoading(4, false)).toBe(false);
  });
});
