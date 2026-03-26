const ALGORITHM = "AES-GCM"
const KEY_LENGTH = 256
const SALT_LENGTH = 16
const IV_LENGTH = 12
const PBKDF2_ITERATIONS = 100000
const WRAPPING_KEY_LENGTH = 256

export async function generateSalt(): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  return bufferToBase64(salt)
}

export async function generateVaultKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH
    },
    true,
    ["encrypt", "decrypt"]
  )
}

export async function deriveWrappingKeyFromPrf(
  prfOutput: ArrayBuffer,
  salt: string
): Promise<CryptoKey> {
  const saltBuffer = base64ToBuffer(salt)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    prfOutput,
    'HKDF',
    false,
    ['deriveKey']
  )
  return await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      salt: saltBuffer as BufferSource,
      info: new TextEncoder().encode('nemo-vault-key'),
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ALGORITHM, length: WRAPPING_KEY_LENGTH },
    true,
    ['wrapKey', 'unwrapKey']
  )
}

export async function wrapVaultKey(
  vaultKey: CryptoKey,
  wrappingKey: CryptoKey
): Promise<{ wrappedKey: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const wrappedKey = await crypto.subtle.wrapKey(
    'raw',
    vaultKey,
    wrappingKey,
    { name: ALGORITHM, iv }
  )
  return {
    wrappedKey: bufferToBase64(new Uint8Array(wrappedKey)),
    iv: bufferToBase64(iv)
  }
}

export async function unwrapVaultKey(
  wrappedKey: string,
  iv: string,
  wrappingKey: CryptoKey
): Promise<CryptoKey> {
  const keyBuffer = base64ToBuffer(wrappedKey)
  const ivBuffer = base64ToBuffer(iv)
  return await crypto.subtle.unwrapKey(
    'raw',
    keyBuffer as BufferSource,
    wrappingKey,
    { name: ALGORITHM, iv: ivBuffer as BufferSource },
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  )
}

export async function deriveKey(
  baseKey: CryptoKey,
  salt: string
): Promise<CryptoKey> {
  const saltBuffer = base64ToBuffer(salt)
  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    baseKey,
    {
      name: ALGORITHM,
      length: KEY_LENGTH
    },
    false,
    ["encrypt", "decrypt"]
  )
}

export async function deriveKeyFromWebAuthn(
  assertion: AuthenticatorAssertionResponse,
  salt: string
): Promise<CryptoKey> {
  const signature = new Uint8Array(assertion.signature)
  const signatureHash = await crypto.subtle.digest("SHA-256", signature)
  const rawKey = await crypto.subtle.importKey(
    "raw",
    signatureHash,
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"]
  )
  return deriveKey(rawKey, salt)
}

export async function encrypt(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encodedText = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv
    },
    key,
    encodedText
  )
  return {
    ciphertext: bufferToBase64(new Uint8Array(ciphertext)),
    iv: bufferToBase64(iv)
  }
}

export async function decrypt(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const ciphertextBuffer = base64ToBuffer(ciphertext)
  const ivBuffer = base64ToBuffer(iv)
  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: ivBuffer as BufferSource
    },
    key,
    ciphertextBuffer as BufferSource
  )
  return new TextDecoder().decode(decrypted)
}

export function bufferToBase64(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
}

export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64)
  const buffer = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i)
  }
  return buffer
}

export function generateUUID(): string {
  return crypto.randomUUID()
}

export function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

export function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}