/**
 * Copyright 2024-2026 Artem Iagovdik <artyom.yagovdik@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const BITS_PER_BASE32_CHAR = 5
const BITS_PER_BYTE = 8
const TOTP_DIGITS_DEFAULT = 6
const TOTP_PERIOD_DEFAULT = 30
const TOTP_SECRET_MIN_LENGTH = 16
const HASH_TRUNC_OFFSET_MASK = 0x0f
const HASH_CODE_MASK = 0x7f
const COUNTER_BYTES = 8

export interface TOTPConfig {
  secret: string
  digits?: number
  period?: number
  algorithm?: 'SHA-1' | 'SHA-256' | 'SHA-512'
  issuer?: string
  accountName?: string
}

export interface TOTPCode {
  code: string
  remainingSeconds: number
  progress: number
}

/**
 * Base32 decoding following RFC 4648.
 * Used to convert the secret string to bytes for HMAC operations.
 */
function base32Decode(encoded: string): Uint8Array {
  const cleaned = encoded.toUpperCase().replace(/=+$/, '').replace(/\s/g, '')

  const bits: number[] = []
  for (const char of cleaned) {
    const val = BASE32_CHARS.indexOf(char)
    if (val === -1) throw new Error(`Invalid base32 character: ${char}`)
    for (let i = BITS_PER_BASE32_CHAR - 1; i >= 0; i--) {
      bits.push((val >> i) & 1)
    }
  }

  const bytes: number[] = []
  for (let i = 0; i < bits.length; i += BITS_PER_BYTE) {
    const byte = bits.slice(i, i + BITS_PER_BYTE).reduce((acc, bit, idx) => acc | (bit << (BITS_PER_BYTE - 1 - idx)), 0)
    bytes.push(byte)
  }

  return new Uint8Array(bytes)
}

/**
 * Generate HOTP code using HMAC following RFC 4226.
 * This is the core algorithm that TOTP builds upon.
 */
async function generateHOTP(
  secret: Uint8Array,
  counter: number,
  digits: number = TOTP_DIGITS_DEFAULT,
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512' = 'SHA-1'
): Promise<string> {
  const counterBuffer = new ArrayBuffer(COUNTER_BYTES)
  const counterView = new DataView(counterBuffer)
  counterView.setBigUint64(0, BigInt(counter), false)

  // Web Crypto API type workaround - Uint8Array is valid but TypeScript disagrees
  const key = await (crypto.subtle.importKey as any)(
    'raw',
    secret,
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, counterBuffer)
  const hash = new Uint8Array(signature)

  // Dynamic truncation: use last 4 bits of hash to determine offset
  const offset = hash[hash.length - 1] & HASH_TRUNC_OFFSET_MASK
  const code =
    ((hash[offset] & HASH_CODE_MASK) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)

  const modulo = Math.pow(10, digits)
  const hotp = code % modulo

  return hotp.toString().padStart(digits, '0')
}

/**
 * Generate TOTP code following RFC 6238.
 * Creates a time-based one-time password that changes every 30 seconds.
 *
 * @param config - TOTP configuration with secret and optional parameters
 * @returns Current TOTP code with countdown information
 * @throws {Error} If secret is invalid or crypto operations fail
 */
export async function generateTOTP(config: TOTPConfig): Promise<TOTPCode> {
  const { secret, digits = TOTP_DIGITS_DEFAULT, period = TOTP_PERIOD_DEFAULT, algorithm = 'SHA-1' } = config

  try {
    const secretBytes = base32Decode(secret)
    const now = Math.floor(Date.now() / 1000)
    const counter = Math.floor(now / period)
    const remainingSeconds = period - (now % period)
    const progress = remainingSeconds / period

    const code = await generateHOTP(secretBytes, counter, digits, algorithm)

    return {
      code,
      remainingSeconds,
      progress
    }
  } catch {
    throw new Error('Failed to generate TOTP code. Check that the secret is valid.')
  }
}

/**
 * Parse TOTP URI (otpauth://) from authenticator apps.
 * Format: otpauth://totp/{label}?secret={secret}&issuer={issuer}
 *
 * @param uri - The otpauth:// URI from a QR code
 * @returns Parsed TOTP config or null if invalid
 */
export function parseTOTPUri(uri: string): TOTPConfig | null {
  try {
    const url = new URL(uri)

    if (url.protocol !== 'otpauth:') return null
    if (url.hostname !== 'totp') return null

    const secret = url.searchParams.get('secret')
    if (!secret) return null

    const path = decodeURIComponent(url.pathname.replace(/^\//, ''))
    let issuer = url.searchParams.get('issuer') || ''
    let accountName = path

    // Handle issuer:account format commonly used by authenticator apps
    if (path.includes(':')) {
      const [parsedIssuer, ...accountParts] = path.split(':')
      issuer = issuer || parsedIssuer
      accountName = accountParts.join(':')
    }

    return {
      secret,
      digits: parseInt(url.searchParams.get('digits') || String(TOTP_DIGITS_DEFAULT), 10),
      period: parseInt(url.searchParams.get('period') || String(TOTP_PERIOD_DEFAULT), 10),
      algorithm: (url.searchParams.get('algorithm') as TOTPConfig['algorithm']) || 'SHA-1',
      issuer,
      accountName
    }
  } catch {
    return null
  }
}

/**
 * Generate TOTP URI for export/QR code generation.
 *
 * @param config - TOTP configuration
 * @returns otpauth:// URI string
 */
export function generateTOTPUri(config: TOTPConfig): string {
  const {
    secret,
    issuer = '',
    accountName = '',
    digits = TOTP_DIGITS_DEFAULT,
    period = TOTP_PERIOD_DEFAULT,
    algorithm = 'SHA-1'
  } = config

  const label = issuer
    ? `${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}`
    : encodeURIComponent(accountName)

  const params = new URLSearchParams({
    secret: secret.replace(/\s/g, ''),
    ...(issuer && { issuer }),
    ...(digits !== TOTP_DIGITS_DEFAULT && { digits: digits.toString() }),
    ...(period !== TOTP_PERIOD_DEFAULT && { period: period.toString() }),
    ...(algorithm !== 'SHA-1' && { algorithm })
  })

  return `otpauth://totp/${label}?${params.toString()}`
}

/**
 * Validate TOTP secret (must be valid base32 with minimum length).
 * Base32 requires characters A-Z and 2-7 only.
 *
 * @param secret - The secret string to validate
 * @returns True if valid base32 secret
 */
export function isValidTOTPSecret(secret: string): boolean {
  if (!secret) return false
  const cleaned = secret.toUpperCase().replace(/=+$/, '').replace(/\s/g, '')
  const validChars = /^[A-Z2-7]+$/
  return validChars.test(cleaned) && cleaned.length >= TOTP_SECRET_MIN_LENGTH
}

/**
 * Format secret for display (groups of 4 characters for readability).
 *
 * @param secret - Raw secret string
 * @returns Formatted secret like "ABCD EFGH IJKL"
 */
export function formatTOTPSecret(secret: string): string {
  return secret.toUpperCase().replace(/\s/g, '').match(/.{1,4}/g)?.join(' ') || secret
}

/**
 * Generate random TOTP secret for new 2FA setups.
 *
 * @param length - Secret length in characters (default: 32)
 * @returns Random base32 secret string
 */
export function generateTOTPSecret(length: number = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => BASE32_CHARS[b % BASE32_CHARS.length]).join('')
}
