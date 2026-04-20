import { Keypair } from "@stellar/stellar-sdk";
import nacl from "tweetnacl";

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

  const adminKeypair = Keypair.fromPublicKey(adminPublicKeyStr);
  const adminRawPubKey = adminKeypair.rawPublicKey();

  const nonce = nacl.randomBytes(nacl.box.nonceLength);

  const encryptedAesKey = nacl.box(new Uint8Array(rawAesKey), nonce, adminRawPubKey, userEphemeral.secretKey);

  return {
    ciphertext: bufferToBase64(encryptedFileBuffer),
    iv: bufferToBase64(iv),
    encryptedKey: bufferToBase64(combine(nonce, userEphemeral.publicKey, encryptedAesKey)),
    salt: "",
  };
}

export async function decryptFileAsAdmin(data: EncryptedData, adminSecretKeyStr: string): Promise<ArrayBuffer> {
  const adminKeypair = Keypair.fromSecret(adminSecretKeyStr);
  const adminRawSecret = adminKeypair.rawSecretKey();

  const combined = base64ToBuffer(data.encryptedKey);
  const nonce = combined.slice(0, nacl.box.nonceLength);
  const senderPub = combined.slice(nacl.box.nonceLength, nacl.box.nonceLength + nacl.box.publicKeyLength);
  const boxData = combined.slice(nacl.box.nonceLength + nacl.box.publicKeyLength);

  const decryptedAesKeyRaw = nacl.box.open(boxData, nonce, senderPub, adminRawSecret);

  if (!decryptedAesKeyRaw) {
    throw new Error("Failed to decrypt secure metadata. Invalid Admin Key?");
  }

  const aesKey = await window.crypto.subtle.importKey("raw", decryptedAesKeyRaw, { name: "AES-GCM" }, false, [
    "decrypt",
  ]);

  const decryptedFile = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(data.iv) },
    aesKey,
    base64ToBuffer(data.ciphertext),
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
