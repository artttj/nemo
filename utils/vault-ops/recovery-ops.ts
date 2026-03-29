

import type { MessageResponse } from "../types"
import { loadVault, saveVault, loadRecoveryData } from "../vault"
import { recoverVaultKey } from "../../vault/recovery"
import { getSessionKey } from "./session"

export async function verifyRecoveryPhrase(phrase: string): Promise<MessageResponse> {
  try {
    const recoveryData = await loadRecoveryData()
    if (!recoveryData) {
      return { success: false, error: "No recovery data found" }
    }

    await recoverVaultKey(phrase, recoveryData)
    return { success: true }
  } catch {
    return { success: false, error: "Invalid recovery phrase" }
  }
}

export async function getRecoveryStatus(): Promise<MessageResponse> {
  try {
    const sessionKey = getSessionKey()
    const recoveryData = await loadRecoveryData()
    const vault = await loadVault(sessionKey!)

    if (!recoveryData || !vault) {
      return { success: true, data: { hasRecovery: false } }
    }

    const verifiedAt = vault.settings?.recoveryPhraseVerifiedAt
    const dismissedAt = vault.settings?.recoveryPhraseReminderDismissedAt
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

    return {
      success: true,
      data: {
        hasRecovery: true,
        lastVerifiedAt: verifiedAt,
        needsReminder: !verifiedAt || verifiedAt < thirtyDaysAgo,
        dismissedAt
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get recovery status"
    }
  }
}

export async function updateRecoveryVerified(): Promise<MessageResponse> {
  try {
    const sessionKey = getSessionKey()
    if (!sessionKey) {
      return { success: false, error: "Vault not unlocked" }
    }

    const vault = await loadVault(sessionKey)
    if (!vault) {
      return { success: false, error: "Failed to load vault" }
    }

    vault.settings = {
      ...vault.settings,
      recoveryPhraseVerifiedAt: Date.now()
    }

    await saveVault(vault, sessionKey)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update recovery status"
    }
  }
}

export async function dismissRecoveryReminder(): Promise<MessageResponse> {
  try {
    const sessionKey = getSessionKey()
    if (!sessionKey) {
      return { success: false, error: "Vault not unlocked" }
    }

    const vault = await loadVault(sessionKey)
    if (!vault) {
      return { success: false, error: "Failed to load vault" }
    }

    vault.settings = {
      ...vault.settings,
      recoveryPhraseReminderDismissedAt: Date.now()
    }

    await saveVault(vault, sessionKey)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to dismiss reminder"
    }
  }
}
