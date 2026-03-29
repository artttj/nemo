

import { wrapVaultKey, unwrapVaultKey } from "../utils/crypto"
import { generateRandomBytes, bufferToBase64, base64ToBuffer } from "../utils/crypto"
import type { PinData } from "./types"

const PIN_KEY_PREFIX = "nemo_pin_"
const MAX_PIN_ATTEMPTS = 5
const PIN_LOCKOUT_DURATION_MS = 30 * 60 * 1000 

export interface PinSetupResult {
  success: boolean
  error?: string
}

export interface PinUnlockResult {
  success: boolean
  vaultKey?: CryptoKey
  error?: string
  pinData?: PinData
}

function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const pinData = encoder.encode(pin)
  const saltBuffer = salt.buffer as ArrayBuffer
  
  return crypto.subtle.importKey(
    "raw",
    pinData,
    "PBKDF2",
    false,
    ["deriveKey"]
  ).then(keyMaterial => {
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBuffer,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
    )
  })
}

export async function setupPin(
  pin: string,
  vaultKey: CryptoKey
): Promise<{ pinData: PinData }> {
  if (!isValidPin(pin)) {
    throw new Error("PIN must be 4-6 digits")
  }
  
  const salt = generateRandomBytes(32)
  const pinKey = await deriveKeyFromPin(pin, salt)
  
  const { wrappedKey, iv } = await wrapVaultKey(vaultKey, pinKey)
  
  const pinData: PinData = {
    version: 1,
    wrappedVaultKey: wrappedKey,
    iv,
    salt: bufferToBase64(salt),
    createdAt: Date.now(),
    attemptsRemaining: MAX_PIN_ATTEMPTS,
    lockedUntil: null,
    pinLength: pin.length
  }
  
  return { pinData }
}

export async function unlockWithPin(
  pin: string,
  pinData: PinData
): Promise<PinUnlockResult> {
  if (pinData.lockedUntil && pinData.lockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((pinData.lockedUntil - Date.now()) / 60000)
    return {
      success: false,
      error: `Too many attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`
    }
  }
  
  if (!isValidPin(pin)) {
    return { success: false, error: "PIN must be 4-6 digits" }
  }
  
  try {
    const salt = base64ToBuffer(pinData.salt)
    const pinKey = await deriveKeyFromPin(pin, salt)
    
    const vaultKey = await unwrapVaultKey(
      pinData.wrappedVaultKey,
      pinData.iv,
      pinKey
    )
    
    return { success: true, vaultKey, pinData: { ...pinData, attemptsRemaining: MAX_PIN_ATTEMPTS, lockedUntil: null } }
  } catch {
    const attemptsRemaining = (pinData.attemptsRemaining ?? MAX_PIN_ATTEMPTS) - 1
    const lockedUntil = attemptsRemaining <= 0 ? Date.now() + PIN_LOCKOUT_DURATION_MS : null
    
    return {
      success: false,
      error: attemptsRemaining <= 0
        ? "Too many attempts. PIN unlock disabled for 30 minutes."
        : `Incorrect PIN. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining.`,
      pinData: { ...pinData, attemptsRemaining: Math.max(0, attemptsRemaining), lockedUntil }
    }
  }
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin)
}

export async function storePinData(pinData: PinData): Promise<void> {
  await chrome.storage.local.set({ [PIN_KEY_PREFIX + "data"]: pinData })
}

export async function loadPinData(): Promise<PinData | null> {
  const result = await chrome.storage.local.get(PIN_KEY_PREFIX + "data")
  return result[PIN_KEY_PREFIX + "data"] ?? null
}

export async function clearPinData(): Promise<void> {
  await chrome.storage.local.remove(PIN_KEY_PREFIX + "data")
}

export async function hasPinSetup(): Promise<boolean> {
  const pinData = await loadPinData()
  return pinData !== null
}

export function updatePinAttempts(pinData: PinData, attemptsRemaining: number, lockedUntil: number | null): PinData {
  return {
    ...pinData,
    attemptsRemaining,
    lockedUntil
  }
}

export async function getPinLength(): Promise<number> {
  const pinData = await loadPinData()
  return pinData?.pinLength ?? 4
}
