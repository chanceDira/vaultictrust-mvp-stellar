import { Keypair } from "@stellar/stellar-sdk";
import nacl from "tweetnacl";

function ed2curve_public_convert(edPublic: Uint8Array): Uint8Array {
  return edToCurve(edPublic);
}

async function ed2curve_secret_convert_async(edSeed: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest("SHA-512", edSeed as any);
  const scalar = new Uint8Array(hashBuffer.slice(0, 32));
  scalar[0] &= 248;
  scalar[31] &= 127;
  scalar[31] |= 64;
  return scalar;
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  encryptedKey: string;
  salt: string;
}

export async function encryptFileForAdmin(file: File, adminPublicKeyStr: string): Promise<EncryptedData> {
  const aesKey = await window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);

  const fileBuffer = await file.arrayBuffer();

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedFileBuffer = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, fileBuffer);

  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

  const userEphemeral = nacl.box.keyPair();

  const adminKeypair = Keypair.fromPublicKey(adminPublicKeyStr);
  const adminRawPubKey = adminKeypair.rawPublicKey();
  const convertedAdminPub = ed2curve_public_convert(adminRawPubKey);

  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const encryptedAesKey = nacl.box(new Uint8Array(rawAesKey), nonce, convertedAdminPub, userEphemeral.secretKey);

  return {
    ciphertext: bufferToBase64(encryptedFileBuffer),
    iv: bufferToBase64(iv),
    encryptedKey: bufferToBase64(combine(nonce, userEphemeral.publicKey, encryptedAesKey)),
    salt: "",
  };
}

export async function decryptFileAsAdmin(data: EncryptedData, adminSecretKeyStr: string): Promise<ArrayBuffer> {
  const adminKeypair = Keypair.fromSecret(adminSecretKeyStr);
  const adminSeed = adminKeypair.rawSecretKey();

  const x25519Scalar = await ed2curve_secret_convert_async(adminSeed);
  const adminX25519 = nacl.box.keyPair.fromSecretKey(x25519Scalar);

  const combined = base64ToBuffer(data.encryptedKey);
  const nonce = combined.slice(0, nacl.box.nonceLength);
  const senderPub = combined.slice(nacl.box.nonceLength, nacl.box.nonceLength + nacl.box.publicKeyLength);
  const boxData = combined.slice(nacl.box.nonceLength + nacl.box.publicKeyLength);

  const decryptedAesKeyRaw = nacl.box.open(boxData, nonce, senderPub, adminX25519.secretKey);

  if (!decryptedAesKeyRaw) {
    throw new Error(
      "Decryption failed: The provided Admin Org Key does not match the key used to encrypt this document. Verify you are using the correct Vaultic Org Secret Key.",
    );
  }

  const aesKey = await globalThis.crypto.subtle.importKey(
    "raw",
    decryptedAesKeyRaw as any,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const decryptedFile = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(data.iv) as any },
    aesKey,
    base64ToBuffer(data.ciphertext) as any,
  );

  return decryptedFile;
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function combine(...buffers: Uint8Array[]): Uint8Array {
  const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const b of buffers) {
    combined.set(b, offset);
    offset += b.length;
  }
  return combined;
}

function edToCurve(edPublic: Uint8Array): Uint8Array {
  const bigP = BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffed");
  const bigY = bytesToBigInt(edPublic) & ((1n << 255n) - 1n);
  const one = 1n;
  const num = (one + bigY) % bigP;
  const den = (one - bigY + bigP) % bigP;
  const u = (num * modInverse(den, bigP)) % bigP;
  return bigIntToBytes(u);
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let res = 0n;
  for (let i = 0; i < bytes.length; i++) {
    res += BigInt(bytes[i]) << BigInt(i * 8);
  }
  return res;
}

function bigIntToBytes(n: bigint): Uint8Array {
  const res = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    res[i] = Number((n >> BigInt(i * 8)) & 0xffn);
  }
  return res;
}

function modInverse(a: bigint, m: bigint): bigint {
  const m0 = m;
  let t: bigint, q: bigint;
  let x0 = 0n,
    x1 = 1n;
  if (m === 1n) return 0n;
  while (a > 1n) {
    q = a / m;
    t = m;
    m = a % m;
    a = t;
    t = x0;
    x0 = x1 - q * x0;
    x1 = t;
  }
  if (x1 < 0n) x1 += m0;
  return x1;
}
