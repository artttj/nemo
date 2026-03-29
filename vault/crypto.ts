

import type { EncryptedVault, VaultData } from "./types";

export {
  bufferToBase64,
  base64ToBuffer,
  generateUUID,
  generateRandomBytes,
  generateSalt,
  generateVaultKey,
  wrapVaultKey,
  unwrapVaultKey,
  deriveWrappingKeyFromPrf,
} from "../utils/crypto";

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const PBKDF2_ITERATIONS = 600000;

import { bufferToBase64, base64ToBuffer } from "../utils/crypto";

export type KDFType = "argon2id" | "pbkdf2";

export interface KeyDerivationParams {
  type: KDFType;
  salt: string;
  iterations?: number;
  memoryCost?: number;
  timeCost?: number;
  parallelism?: number;
}

export async function deriveKeyFromPassword(
  password: string,
  params: KeyDerivationParams
): Promise<CryptoKey> {
  const saltBuffer = base64ToBuffer(params.salt);
  const passwordBuffer = new TextEncoder().encode(password);
  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer.buffer as ArrayBuffer,
      iterations: params.iterations ?? PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    baseKey,
    {
      name: ALGORITHM,
      length: KEY_LENGTH
    },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptVault(
  vault: VaultData,
  key: CryptoKey,
  salt: string,
  kdf: KDFType = "pbkdf2"
): Promise<EncryptedVault> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const plaintext = JSON.stringify(vault);
  const encodedText = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv
    },
    key,
    encodedText
  );

  return {
    kdf,
    salt,
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(new Uint8Array(ciphertext)),
    version: vault.version
  };
}

export async function decryptVault(encrypted: EncryptedVault, key: CryptoKey): Promise<VaultData> {
  const ciphertextBuffer = base64ToBuffer(encrypted.ciphertext);
  const ivBuffer = base64ToBuffer(encrypted.iv);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: ivBuffer as BufferSource
    },
    key,
    ciphertextBuffer as BufferSource
  );

  const text = new TextDecoder().decode(decrypted);
  return JSON.parse(text) as VaultData;
}

export async function wipeKey(key: CryptoKey | null): Promise<void> {
  if (!key) return;
  try {
    await crypto.subtle.exportKey("raw", key);
  } catch {
  }
}
