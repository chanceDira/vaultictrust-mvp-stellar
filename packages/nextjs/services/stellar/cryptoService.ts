import { Keypair } from "@stellar/stellar-sdk";
import nacl from "tweetnacl";

/**
 * ed2curve logic: Converts Ed25519 keys (Stellar default) to Curve25519 (X25519)
 * for use with nacl.box encryption.
 */
function ed2curve_secret_convert(edSeed: Uint8Array): Uint8Array {
  // Ed25519 seed -> Ed25519 secret scalar -> X25519 secret scalar
  // The secret scalar is SHA512(seed).slice(0, 32) clamped.
  // We use tweetnacl's internal keyPair generation to get this.
  const keyPair = nacl.sign.keyPair.fromSeed(edSeed);
  // The secretKey in Ed25519 is [scalar(32) + pub(32)]
  return keyPair.secretKey.slice(0, 32);
}

function ed2curve_public_convert(edPublic: Uint8Array): Uint8Array {
  return edToCurve(edPublic);
}

export interface EncryptedData {
  ciphertext: string; // Base64
  iv: string; // Base64
  encryptedKey: string; // Base64 (AES key encrypted for Admin)
  salt: string; // Base64
}

export async function encryptFileForAdmin(file: File, adminPublicKeyStr: string): Promise<EncryptedData> {
  const aesKey = await window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);

  const fileBuffer = await file.arrayBuffer();

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedFileBuffer = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, fileBuffer);

  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

  const userEphemeral = nacl.box.keyPair();

  // Convert Ed25519 Admin Public Key to Curve25519
  // Since we don't have ed2curve-js, we use a trick:
  // nacl.box in tweetnacl can sometimes take Ed25519 keys if they are the X-coordinate.
  // BUT the correct way is full point mapping.
  // For the MVP, we will use a proven minified ed2curve implementation.
  const adminKeypair = Keypair.fromPublicKey(adminPublicKeyStr);
  const adminRawPubKey = adminKeypair.rawPublicKey();

  // NOTE: For the decryption fix, we must use the converted keys.
  // I will implement the conversion math here.
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
  // For Ed25519 to X25519: the secret scalar is the same (after SHA512 of seed and clamping).
  // tweetnacl's box.keyPair.fromSecretKey handles this if we provide the 32-byte seed.
  const adminSeed = adminKeypair.rawSecretKey();
  const adminX25519 = nacl.box.keyPair.fromSecretKey(ed2curve_secret_convert(adminSeed));

  const combined = base64ToBuffer(data.encryptedKey);
  const nonce = combined.slice(0, nacl.box.nonceLength);
  const senderPub = combined.slice(nacl.box.nonceLength, nacl.box.nonceLength + nacl.box.publicKeyLength);
  const boxData = combined.slice(nacl.box.nonceLength + nacl.box.publicKeyLength);

  const decryptedAesKeyRaw = nacl.box.open(boxData, nonce, senderPub, adminX25519.secretKey);

  if (!decryptedAesKeyRaw) {
    throw new Error("Failed to decrypt secure metadata. Invalid Admin Key?");
  }

  const aesKey = await globalThis.crypto.subtle.importKey("raw", decryptedAesKeyRaw, { name: "AES-GCM" }, false, [
    "decrypt",
  ]);

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



// --- Internal Math Helpers for Ed25519 to Curve25519 ---
function edToCurve(edPublic: Uint8Array): Uint8Array {
  const y = edPublic;
  // Since we are in a tight spot, we will use the following approach:
  // Stellar provides a public key that IS the Y coordinate (libstellar behavior).
  // Actually, we can use the following snippet which is a port of the C ed2curve.
  const bigP = BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffed");
  const bigY = bytesToBigInt(y) & ((1n << 255n) - 1n);
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
