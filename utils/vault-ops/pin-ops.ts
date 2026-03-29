

import type { MessageResponse, Vault } from "../types"
import { vaultExists, loadVault, loadVaultMetadata } from "../vault"
import {
  setupPin,
  unlockWithPin,
  storePinData,
  loadPinData,
  clearPinData,
  hasPinSetup,
  getPinLength
} from "../../vault/pin"
import {
  getSessionKey,
  setSessionKey,
  setCurrentVaultState,
  resetAutoLock
} from "./session"
import { startPeriodicSync, syncOnUnlock } from "./sync-manager"

export async function setupVaultPin(pin: string, vaultKey?: CryptoKey): Promise<MessageResponse> {
  try {
    const key = vaultKey || getSessionKey()
    if (!key) {
      return { success: false, error: "Vault must be unlocked to set up PIN" }
    }

    const { pinData } = await setupPin(pin, key)
    await storePinData(pinData)

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to set up PIN"
    }
  }
}

export async function unlockVaultWithPin(pin: string): Promise<MessageResponse<Vault>> {
  try {
    const pinData = await loadPinData()
    if (!pinData) {
      return { success: false, error: "No PIN set up" }
    }

    const existingVault = await vaultExists()
    if (!existingVault) {
      return { success: false, error: "No vault found. Create a vault first." }
    }

    const metadata = await loadVaultMetadata()
    if (!metadata) {
      return { success: false, error: "Failed to load vault metadata" }
    }

    const result = await unlockWithPin(pin, pinData)

    if (!result.success) {
      if (result.pinData) {
        await storePinData(result.pinData)
      }
      return { success: false, error: result.error }
    }

    if (result.pinData) {
      await storePinData(result.pinData)
    }

    const vaultKey = result.vaultKey!
    setSessionKey(vaultKey)

    const vault = await loadVault(vaultKey)
    if (!vault) {
      return { success: false, error: "Failed to decrypt vault" }
    }

    setCurrentVaultState({
      isUnlocked: true,
      vault,
      metadata,
      lastActivity: Date.now()
    })

    await storePinData({ ...pinData, attemptsRemaining: 5, lockedUntil: null })
    resetAutoLock()
    startPeriodicSync()
    syncOnUnlock().catch(() => {})

    return { success: true, data: vault }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to unlock vault"
    }
  }
}

export async function hasPinConfigured(): Promise<boolean> {
  return await hasPinSetup()
}

export async function getPinConfiguredLength(): Promise<number> {
  return await getPinLength()
}

export async function removeVaultPin(): Promise<MessageResponse> {
  try {
    await clearPinData()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove PIN"
    }
  }
}
