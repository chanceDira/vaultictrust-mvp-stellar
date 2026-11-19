import { describe, expect, it } from "vitest";
import { connectFailureMessage } from "~~/utils/vaultic/walletErrors";

describe("connectFailureMessage", () => {
  it("stays quiet when the user closes the wallet list", () => {
    expect(connectFailureMessage({ code: -1, message: "The user closed the modal." })).toBeNull();
  });

  it("shows the wallet's own reason", () => {
    expect(connectFailureMessage({ code: -1, message: "User declined access" })).toBe("User declined access");
    expect(connectFailureMessage("Varial is not connected")).toBe("Varial is not connected");
  });

  it("falls back when the wallet gives no reason", () => {
    const fallback = "The wallet did not connect. Unlock it and try again.";
    expect(connectFailureMessage({ code: -1 })).toBe(fallback);
    expect(connectFailureMessage({ message: "  " })).toBe(fallback);
    expect(connectFailureMessage(undefined)).toBe(fallback);
  });
});
