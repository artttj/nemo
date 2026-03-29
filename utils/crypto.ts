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

// Password generation constants
const DEFAULT_PASSWORD_LENGTH = 20
const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 64
const ENTROPY_POOL_SIZE = 32

interface PasswordOptions {
  length?: number
  uppercase?: boolean
  lowercase?: boolean
  numbers?: boolean
  symbols?: boolean
}

export function generatePassword(options: PasswordOptions = {}): string {
  const {
    length = DEFAULT_PASSWORD_LENGTH,
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true
  } = options

  // Build character set
  let chars = ''
  if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz'
  if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (numbers) chars += '0123456789'
  if (symbols) chars += '!@#$%^&*'

  if (chars.length === 0) {
    throw new Error('At least one character type must be enabled')
  }

  const clampedLength = Math.max(MIN_PASSWORD_LENGTH, Math.min(length, MAX_PASSWORD_LENGTH))
  const limit = 256 - (256 % chars.length)
  let result = ''

  while (result.length < clampedLength) {
    const bytes = crypto.getRandomValues(new Uint8Array(ENTROPY_POOL_SIZE))
    for (let i = 0; i < bytes.length && result.length < clampedLength; i++) {
      if (bytes[i] < limit) {
        result += chars.charAt(bytes[i] % chars.length)
      }
    }
  }

  return result
}

export function generateSecurePassword(options: PasswordOptions = {}): string {
  const {
    length = DEFAULT_PASSWORD_LENGTH,
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true
  } = options

  const clampedLength = Math.max(MIN_PASSWORD_LENGTH, Math.min(length, MAX_PASSWORD_LENGTH))

  // Build pools
  const pools: string[] = []
  if (lowercase) pools.push('abcdefghijklmnopqrstuvwxyz')
  if (uppercase) pools.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
  if (numbers) pools.push('0123456789')
  if (symbols) pools.push('!@#$%^&*')

  if (pools.length === 0) {
    throw new Error('At least one character type must be enabled')
  }

  // Ensure at least one from each pool
  let password = ''
  for (const pool of pools) {
    const bytes = crypto.getRandomValues(new Uint8Array(1))
    password += pool.charAt(bytes[0] % pool.length)
  }

  // Fill remaining with random from all pools
  const allChars = pools.join('')
  const remaining = clampedLength - password.length
  const limit = 256 - (256 % allChars.length)

  while (password.length < clampedLength) {
    const bytes = crypto.getRandomValues(new Uint8Array(ENTROPY_POOL_SIZE))
    for (let i = 0; i < bytes.length && password.length < clampedLength; i++) {
      if (bytes[i] < limit) {
        password += allChars.charAt(bytes[i] % allChars.length)
      }
    }
  }

  // Shuffle the password
  return shuffleString(password)
}

function shuffleString(str: string): string {
  const arr = str.split('')
  const bytes = crypto.getRandomValues(new Uint8Array(arr.length))

  for (let i = arr.length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }

  return arr.join('')
}