import { Keypair } from "@stellar/stellar-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { decryptFileAsAdmin, encryptFileForAdmin } from "~~/services/stellar/cryptoService";

const ADMIN_KEYPAIR = Keypair.random();
const ADMIN_PUBLIC = ADMIN_KEYPAIR.publicKey();
const ADMIN_SECRET = ADMIN_KEYPAIR.secret();

const PLAINTEXT = "vaultic kyc document content - roundtrip test";

function makeFile(content: string, name = "test.txt"): File {
  return new File([new TextEncoder().encode(content)], name, { type: "text/plain" });
}

describe("cryptoService roundtrip", () => {
  it("encrypt then decrypt returns original content", async () => {
    const file = makeFile(PLAINTEXT);
    const encrypted = await encryptFileForAdmin(file, ADMIN_PUBLIC);

    expect(encrypted.ciphertext).toBeTruthy();
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.encryptedKey).toBeTruthy();

    const decrypted = await decryptFileAsAdmin(encrypted, ADMIN_SECRET);
    const text = new TextDecoder().decode(decrypted);
    expect(text).toBe(PLAINTEXT);
  });

  it("decrypt with wrong key throws", async () => {
    const file = makeFile(PLAINTEXT);
    const encrypted = await encryptFileForAdmin(file, ADMIN_PUBLIC);

    const wrongKeypair = Keypair.random();
    await expect(decryptFileAsAdmin(encrypted, wrongKeypair.secret())).rejects.toThrow("Decryption failed");
  });

  it("produces different ciphertext for identical inputs", async () => {
    const file1 = makeFile(PLAINTEXT);
    const file2 = makeFile(PLAINTEXT);
    const enc1 = await encryptFileForAdmin(file1, ADMIN_PUBLIC);
    const enc2 = await encryptFileForAdmin(file2, ADMIN_PUBLIC);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
    expect(enc1.iv).not.toBe(enc2.iv);
  });

  it("roundtrip preserves binary content", async () => {
    const binary = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const file = new File([binary], "test.png", { type: "image/png" });
    const encrypted = await encryptFileForAdmin(file, ADMIN_PUBLIC);
    const decrypted = await decryptFileAsAdmin(encrypted, ADMIN_SECRET);
    expect(new Uint8Array(decrypted)).toEqual(binary);
  });
});
