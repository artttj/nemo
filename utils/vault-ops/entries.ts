

import type { MessageResponse, VaultEntry } from "../types"
import {
  saveVault,
  addEntry,
  updateEntry,
  deleteEntry,
  restoreEntryVersion,
  searchEntries,
  getEntryByUrl,
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

export async function handleExportVault(format?: "nemx" | "csv"): Promise<MessageResponse<string>> {
  try {
    const vaultState = getCurrentVaultState()
    if (!vaultState.vault) {
      return { success: false, error: "Vault is locked" }
    }

    const { vault } = vaultState
    const exported = format === "csv"
      ? (await import("../../utils/nemx")).vaultToCsv(vault.entries)
      : (await import("../../utils/nemx")).createNemxExport(vault.entries, vault.settings)

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
    const vaultState = getCurrentVaultState()
    if (!vaultState.vault) {
      return { success: false, error: "Vault is locked" }
    }

    const trimmed = data.trim()
    let entries: VaultEntry[]

    if (trimmed.startsWith("folder,")) {
      const { csvToVault } = await import("../../utils/nemx")
      const result = csvToVault(trimmed)
      entries = result.entries
    } else {
      try {
        const parsed = JSON.parse(trimmed)
        if (parsed.attributes && parsed.data) {
          const { importNemxExport } = await import("../../utils/nemx")
          const result = importNemxExport(trimmed)
          entries = result.entries
        } else {
          return { success: false, error: "Unsupported format. Please use NEMX or CSV export." }
        }
      } catch {
        return { success: false, error: "Invalid file format. Please use NEMX or CSV export." }
      }
    }

    for (const entry of entries) {
      vaultState.vault.entries.push(entry)
    }
    vaultState.lastActivity = Date.now()

    const sessionKey = getSessionKey()
    if (sessionKey) {
      const { saveVault } = await import("../../utils/vault")
      await saveVault(vaultState.vault, sessionKey)
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Import failed"
    }
  }
}
