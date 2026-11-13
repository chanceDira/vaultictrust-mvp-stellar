import { describe, expect, it } from "vitest";
import { parseAdminAddresses } from "~~/utils/vaultic/adminAddresses";

const FIRST = "GCBWGQS24DUWG3HNCIFVICSJQXUTNGRKY7OZ4IZGBJSLK3MYHBY7HWHI";
const SECOND = "GBWAF6C56BDHNNUDY2KLC5HFZPGXBZAFE7YKZC36GZYMI2B5QH2M3NCL";

describe("parseAdminAddresses", () => {
  it("keeps valid public addresses and drops the rest", () => {
    expect(parseAdminAddresses(` ${FIRST}, not-an-address, ${SECOND}, ${FIRST} `)).toEqual([FIRST, SECOND]);
    expect(parseAdminAddresses(undefined)).toEqual([]);
  });
});
