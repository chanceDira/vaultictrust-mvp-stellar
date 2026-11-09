import { describe, expect, it } from "vitest";
import { parseSorobanError } from "~~/services/stellar/sorobanService";

describe("parseSorobanError", () => {
  it("returns null for null input", () => {
    expect(parseSorobanError(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(parseSorobanError(undefined)).toBeNull();
  });

  it("maps known panic string to user-friendly message", () => {
    const result = parseSorobanError({ error: "not an admin" });
    expect(result).toBe("Unauthorized: Admin privileges required.");
  });

  it("maps investor cap panic to friendly message", () => {
    const result = parseSorobanError({ error: "investor cap exceeded" });
    expect(result).toBe("Investment limit reached for this asset.");
  });

  it("maps over-subscription panic to friendly message", () => {
    const result = parseSorobanError({ error: "insufficient shares available" });
    expect(result).toBe("Not enough shares remaining.");
  });

  it("maps fully subscribed to friendly message", () => {
    const result = parseSorobanError({ error: "offering fully subscribed" });
    expect(result).toBe("Sold out! This offering is closed.");
  });

  it("maps KYC not verified to friendly message", () => {
    const result = parseSorobanError({ error: "investor not kyc verified" });
    expect(result).toBe("KYC Required: Please verify your identity first.");
  });

  it("extracts contract error code #10 as insufficient balance", () => {
    const result = parseSorobanError({ error: "Error(Contract, #10)" });
    expect(result).toBe("Insufficient Balance: You don't have enough USDC/XLM.");
  });

  it("extracts contract error code #13 as trustline error", () => {
    const result = parseSorobanError({ error: "Error(Contract, #13)" });
    expect(result).toBe("Trustline Error: Asset not trusted in your wallet.");
  });

  it("extracts contract error code #1 as protocol state conflict", () => {
    const result = parseSorobanError({ error: "Error(Contract, #1)" });
    expect(result).toBe("Protocol State Conflict: Action currently restricted.");
  });

  it("returns raw error string for unknown contract error code", () => {
    const result = parseSorobanError({ error: "Error(Contract, #42)" });
    expect(result).toContain("Contract Error #42");
  });

  it("returns raw error string when no mapping matches", () => {
    const result = parseSorobanError({ error: "some completely unknown error xyz" });
    expect(result).toBe("some completely unknown error xyz");
  });

  it("is case-insensitive for key matching", () => {
    const result = parseSorobanError({ error: "NOT AN ADMIN" });
    expect(result).toBe("Unauthorized: Admin privileges required.");
  });

  it("handles InvalidAction in error string", () => {
    const result = parseSorobanError({ error: "InvalidAction occurred" });
    expect(result).toBe("Unauthorized or invalid contract state transition.");
  });

  it("handles HostStorageError in error string", () => {
    const result = parseSorobanError({ error: "HostStorageError: TTL expired" });
    expect(result).toBe("Network storage error: Data TTL expired.");
  });
});
