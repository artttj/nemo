

import type { MessageResponse, VaultEntry } from "../types"
import {
  saveVault,
  addEntry,
  updateEntry,
  deleteEntry,
  restoreEntryVersion,
  searchEntries,
  getEntryByUrl,
  exportVault,
  importVault
} from "../vault"
import { getSessionKey, getCurrentVaultState } from "./session"
import { triggerAutoSync } from "./sync-manager"

export async function handleAddEntry(entry: Omit<VaultEntry, "id" | "createdAt" | "updatedAt">): Promise<MessageResponse<VaultEntry>> {
  try {
    const sessionKey = getSessionKey()
    const vaultState = getCurrentVaultState()
    if (!sessionKey || !vaultState.vault) {
      return { success: false, error: "Vault is locked" }
    }

    const newVault = addEntry(vaultState.vault, entry)
    await saveVault(newVault, sessionKey)

    vaultState.vault = newVault
    vaultState.lastActivity = Date.now()

    const newEntry = newVault.entries[newVault.entries.length - 1]
    await triggerAutoSync()
    return { success: true, data: newEntry }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add entry"
    }
  }
}

export async function handleUpdateEntry(id: string, updates: Partial<VaultEntry>): Promise<MessageResponse<VaultEntry>> {
  try {
    const sessionKey = getSessionKey()
    const vaultState = getCurrentVaultState()
    if (!sessionKey || !vaultState.vault) {
      return { success: false, error: "Vault is locked" }
    }

    const newVault = updateEntry(vaultState.vault, id, updates)
    await saveVault(newVault, sessionKey)

    vaultState.vault = newVault
    vaultState.lastActivity = Date.now()

    const entry = newVault.entries.find((e) => e.id === id)
    await triggerAutoSync()
    return { success: true, data: entry }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update entry"
    }
  }
}

export async function handleDeleteEntry(id: string): Promise<MessageResponse> {
  try {
    const sessionKey = getSessionKey()
    const vaultState = getCurrentVaultState()
    if (!sessionKey || !vaultState.vault) {
      return { success: false, error: "Vault is locked" }
    }

    const newVault = deleteEntry(vaultState.vault, id)
    await saveVault(newVault, sessionKey)

    vaultState.vault = newVault
    vaultState.lastActivity = Date.now()

    await triggerAutoSync()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete entry"
    }
  }
}

export async function handleRestoreEntryVersion(entryId: string, version: number): Promise<MessageResponse> {
  try {
    const sessionKey = getSessionKey()
    const vaultState = getCurrentVaultState()
    if (!sessionKey || !vaultState.vault) {
      return { success: false, error: "Vault is locked" }
    }

    const newVault = restoreEntryVersion(vaultState.vault, entryId, version)
    await saveVault(newVault, sessionKey)

    vaultState.vault = newVault
    vaultState.lastActivity = Date.now()

    const entry = newVault.entries.find((e) => e.id === entryId)
    return { success: true, data: entry }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to restore version"
    }
  }
}

export async function handleSearchEntries(query: string): Promise<MessageResponse<VaultEntry[]>> {
  try {
    const vaultState = getCurrentVaultState()
    if (!vaultState.vault) {
      return { success: false, error: "Vault is locked" }
    }

    const results = searchEntries(vaultState.vault, query)
    return { success: true, data: results }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Search failed"
    }
  }
}

export async function handleGetEntryByUrl(url: string): Promise<MessageResponse<VaultEntry>> {
  try {
    const vaultState = getCurrentVaultState()
    if (!vaultState.vault) {
      return { success: false, error: "Vault is locked" }
    }

    const entry = getEntryByUrl(vaultState.vault, url)
    if (!entry) {
      return { success: false, error: "No entry found for this URL" }
    }
    return { success: true, data: entry }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get entry"
    }
  }
}

export async function handleExportVault(): Promise<MessageResponse<string>> {
  try {
    const sessionKey = getSessionKey()
    if (!sessionKey) {
      return { success: false, error: "Vault is locked" }
    }

    const exported = await exportVault(sessionKey)
    return { success: true, data: exported }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Export failed"
    }
  }
}

export async function handleImportVault(data: string): Promise<MessageResponse> {
  try {
    const sessionKey = getSessionKey()
    const vaultState = getCurrentVaultState()
    if (!sessionKey) {
      return { success: false, error: "Vault is locked" }
    }

    const { vault } = await importVault(data, sessionKey)
    vaultState.vault = vault
    vaultState.lastActivity = Date.now()

    return { success: true, data: vault }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Import failed"
    }
  }
}
