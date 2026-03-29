

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

async function generateHOTP(
  secret: Uint8Array,
  counter: number,
  digits: number = TOTP_DIGITS_DEFAULT,
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512' = 'SHA-1'
): Promise<string> {
  const counterBuffer = new ArrayBuffer(COUNTER_BYTES)
  const counterView = new DataView(counterBuffer)
  counterView.setBigUint64(0, BigInt(counter), false)

  
  const key = await (crypto.subtle.importKey as any)(
    'raw',
    secret,
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, counterBuffer)
  const hash = new Uint8Array(signature)

  
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

export function isValidTOTPSecret(secret: string): boolean {
  if (!secret) return false
  const cleaned = secret.toUpperCase().replace(/=+$/, '').replace(/\s/g, '')
  const validChars = /^[A-Z2-7]+$/
  return validChars.test(cleaned) && cleaned.length >= TOTP_SECRET_MIN_LENGTH
}

export function formatTOTPSecret(secret: string): string {
  return secret.toUpperCase().replace(/\s/g, '').match(/.{1,4}/g)?.join(' ') || secret
}

export function generateTOTPSecret(length: number = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => BASE32_CHARS[b % BASE32_CHARS.length]).join('')
}
