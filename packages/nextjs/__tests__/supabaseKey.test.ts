import { describe, expect, it } from "vitest";
import { readSupabaseAdminKey } from "~~/services/stellar/listingCopyService";

describe("readSupabaseAdminKey", () => {
  it("prefers the secret key and still accepts the legacy service role key", () => {
    expect(
      readSupabaseAdminKey({
        SUPABASE_SECRET_KEY: " sb_secret_example ",
        SUPABASE_SERVICE_ROLE_KEY: "legacy-jwt",
      }),
    ).toBe("sb_secret_example");
    expect(readSupabaseAdminKey({ SUPABASE_SERVICE_ROLE_KEY: "legacy-jwt" })).toBe("legacy-jwt");
    expect(readSupabaseAdminKey({})).toBeNull();
  });
});
