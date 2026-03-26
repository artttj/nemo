declare(strict_types=1);

import type { EncryptedVault, VaultData, VaultMetadata } from "./types";

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const PBKDF2_ITERATIONS = 600000;

export type KDFType = "argon2id" | "pbkdf2";

export interface KeyDerivationParams {
  type: KDFType;
  salt: string;
  iterations?: number;
  memoryCost?: number;
  timeCost?: number;
  parallelism?: number;
}

export async function generateSalt(length: number = 16): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(length));
  return bufferToBase64(salt);
}

export async function generateVaultKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH
    },
    true,
    ["encrypt", "decrypt"]
  );
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

  if (params.type === "pbkdf2") {
    return await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBuffer,
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

  throw new Error("Argon2id not available in this environment. Use pbkdf2 or install argon2 WASM module.");
}

export async function wrapVaultKey(
  vaultKey: CryptoKey,
  wrappingKey: CryptoKey
): Promise<{ wrappedKey: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const wrappedKey = await crypto.subtle.wrapKey(
    "raw",
    vaultKey,
    wrappingKey,
    { name: ALGORITHM, iv }
  );
  return {
    wrappedKey: bufferToBase64(new Uint8Array(wrappedKey)),
    iv: bufferToBase64(iv)
  };
}

export async function unwrapVaultKey(
  wrappedKey: string,
  iv: string,
  wrappingKey: CryptoKey
): Promise<CryptoKey> {
  const keyBuffer = base64ToBuffer(wrappedKey);
  const ivBuffer = base64ToBuffer(iv);
  return await crypto.subtle.unwrapKey(
    "raw",
    keyBuffer as BufferSource,
    wrappingKey,
    { name: ALGORITHM, iv: ivBuffer as BufferSource },
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptVault(vault: VaultData, key: CryptoKey, kdf: KDFType = "pbkdf2"): Promise<EncryptedVault> {
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
    salt: bufferToBase64(iv),
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

export function bufferToBase64(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer));
}

export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer;
}

export function generateUUID(): string {
  return crypto.randomUUID();
}

export function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const saltBuffer = base64ToBuffer(salt);
  const passwordBuffer = new TextEncoder().encode(password);
  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    baseKey,
    256
  );

  return bufferToBase64(new Uint8Array(bits));
}

export interface DeriveKeyFromPrfParams {
  prfOutputBase64: string;
  salt: string;
}

export async function deriveWrappingKeyFromPrf(
  prfOutput: ArrayBuffer,
  salt: string
): Promise<CryptoKey> {
  const saltBuffer = base64ToBuffer(salt);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    prfOutput,
    "HKDF",
    false,
    ["deriveKey"]
  );

  return await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      salt: saltBuffer as BufferSource,
      info: new TextEncoder().encode("nemo-vault-key"),
      hash: "SHA-256"
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ["wrapKey", "unwrapKey"]
  );
}
