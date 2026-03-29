

import type { MessageResponse, SitePreferences, Vault } from "../types"
import { saveVault } from "../vault"
import { getSessionKey, getCurrentVaultState, resetAutoLock } from "./session"

export async function handleUpdateSettings(settings: Partial<Vault["settings"]>): Promise<MessageResponse> {
  try {
    const sessionKey = getSessionKey()
    const vaultState = getCurrentVaultState()
    if (!sessionKey || !vaultState.vault) {
      return { success: false, error: "Vault is locked" }
    }

    vaultState.vault.settings = {
      ...vaultState.vault.settings,
      ...settings
    }

    await saveVault(vaultState.vault, sessionKey)
    resetAutoLock()

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update settings"
    }
  }
}

export async function handleClipboardCopy(text: string, clearAfter: number = 30000): Promise<MessageResponse> {
  try {
    await navigator.clipboard.writeText(text)

    setTimeout(() => {
      navigator.clipboard.writeText("")
    }, clearAfter)

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to copy to clipboard"
    }
  }
}

export async function handleGetSitePreferences(hostname?: string): Promise<MessageResponse> {
  try {
    const vaultState = getCurrentVaultState()
    if (!vaultState.vault) {
      return { success: false, error: "Vault is locked" }
    }

    const prefs = vaultState.vault.settings.sitePreferences || {}
    if (hostname) {
      return { success: true, data: prefs[hostname] || null }
    }
    return { success: true, data: prefs }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get site preferences"
    }
  }
}

export async function handleSetSitePreferences(
  hostname: string,
  preferences: Partial<SitePreferences>
): Promise<MessageResponse> {
  try {
    const sessionKey = getSessionKey()
    const vaultState = getCurrentVaultState()
    if (!sessionKey || !vaultState.vault) {
      return { success: false, error: "Vault is locked" }
    }

    const existing = vaultState.vault.settings.sitePreferences?.[hostname]
    const now = Date.now()

    vaultState.vault.settings.sitePreferences = {
      ...vaultState.vault.settings.sitePreferences,
      [hostname]: {
        hostname,
        autoFillMode: preferences.autoFillMode ?? existing?.autoFillMode ?? 'ask',
        defaultUsername: preferences.defaultUsername ?? existing?.defaultUsername,
        preferredEntryId: preferences.preferredEntryId ?? existing?.preferredEntryId,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
      }
    }

    await saveVault(vaultState.vault, sessionKey)
    vaultState.lastActivity = Date.now()

    return { success: true, data: vaultState.vault.settings.sitePreferences[hostname] }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to set site preferences"
    }
  }
}

export async function handleDeleteSitePreferences(hostname: string): Promise<MessageResponse> {
  try {
    const sessionKey = getSessionKey()
    const vaultState = getCurrentVaultState()
    if (!sessionKey || !vaultState.vault) {
      return { success: false, error: "Vault is locked" }
    }

    if (vaultState.vault.settings.sitePreferences?.[hostname]) {
      const { [hostname]: _, ...remaining } = vaultState.vault.settings.sitePreferences
      vaultState.vault.settings.sitePreferences = remaining
      await saveVault(vaultState.vault, sessionKey)
    }

    vaultState.lastActivity = Date.now()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete site preferences"
    }
  }
}
