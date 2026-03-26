import type {
  Message,
  MessageResponse,
  Vault,
  VaultMetadata,
  VaultEntry,
  VaultState
} from "./types"
import {
  vaultExists,
  initializeVault,
  loadVault,
  saveVault,
  loadVaultMetadata,
  loadVaultKey,
  addEntry,
  updateEntry,
  deleteEntry,
  searchEntries,
  getEntryByUrl,
  exportVault,
  importVault
} from "./vault"
import {
  registerCredential,
  storeCredential,
  getStoredCredentialId,
  deriveKeyFromPrfOutput,
  authenticateWithCredential
} from "./auth"

let vaultState: VaultState = {
  isUnlocked: false,
  vault: null,
  metadata: null,
  lastActivity: Date.now()
}

let sessionKey: CryptoKey | null = null
let autoLockTimeout: ReturnType<typeof setTimeout> | null = null

function getAutoLockMs(): number {
  return (vaultState.vault?.settings.autoLockMinutes ?? 5) * 60 * 1000
}

function resetAutoLock(): void {
  if (autoLockTimeout) {
    clearTimeout(autoLockTimeout)
  }
  autoLockTimeout = setTimeout(() => {
    lockVault()
  }, getAutoLockMs())
}

export async function getVaultState(): Promise<VaultState> {
  return vaultState
}

export async function createVault(): Promise<MessageResponse<VaultMetadata>> {
  try {
    console.log('createVault: starting')
    const credential = await registerCredential()
    console.log('createVault: credential registered')
    await storeCredential(credential)
    
    const wrappingKey = await deriveKeyFromPrfOutput(credential.prfOutput, credential.prfSalt)
    
    const { metadata, vaultKey } = await initializeVault(wrappingKey, credential.prfSalt)
    console.log('createVault: vault initialized')
    
    sessionKey = vaultKey
    
    const vault = await loadVault(sessionKey)
    
    vaultState = {
      isUnlocked: true,
      vault,
      metadata,
      lastActivity: Date.now()
    }
    
    resetAutoLock()
    
    return { success: true, data: metadata }
  } catch (error) {
    console.error('createVault error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create vault"
    }
  }
}

export async function unlockVault(): Promise<MessageResponse<Vault>> {
  try {
    const credentialId = await getStoredCredentialId()
    if (!credentialId) {
      return { success: false, error: "No credential stored" }
    }

    const existingVault = await vaultExists()
    if (!existingVault) {
      return { success: false, error: "No vault found. Create a vault first." }
    }

    const metadata = await loadVaultMetadata()
    if (!metadata) {
      return { success: false, error: "Failed to load vault metadata" }
    }

    const { wrappingKey } = await authenticateWithCredential(credentialId, metadata.salt)
    
    const vaultKey = await loadVaultKey(wrappingKey)
    if (!vaultKey) {
      return { success: false, error: "Failed to unwrap vault key" }
    }

    sessionKey = vaultKey
    
    const vault = await loadVault(sessionKey)
    if (!vault) {
      return { success: false, error: "Failed to decrypt vault" }
    }

    vaultState = {
      isUnlocked: true,
      vault,
      metadata,
      lastActivity: Date.now()
    }

    resetAutoLock()

    return { success: true, data: vault }
  } catch (error) {
    console.error("Unlock error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to unlock vault"
    }
  }
}

export async function lockVault(): Promise<MessageResponse> {
  sessionKey = null
  vaultState = {
    isUnlocked: false,
    vault: null,
    metadata: null,
    lastActivity: Date.now()
  }
  
  if (autoLockTimeout) {
    clearTimeout(autoLockTimeout)
    autoLockTimeout = null
  }
  
  return { success: true }
}

export async function handleAddEntry(entry: Omit<VaultEntry, "id" | "createdAt" | "updatedAt">): Promise<MessageResponse<VaultEntry>> {
  try {
    if (!sessionKey || !vaultState.vault) {
      return { success: false, error: "Vault is locked" }
    }
    
    const newVault = addEntry(vaultState.vault, entry)
    await saveVault(newVault, sessionKey)
    
    vaultState.vault = newVault
    vaultState.lastActivity = Date.now()
    
    const newEntry = newVault.entries[newVault.entries.length - 1]
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
    if (!sessionKey || !vaultState.vault) {
      return { success: false, error: "Vault is locked" }
    }
    
    const newVault = updateEntry(vaultState.vault, id, updates)
    await saveVault(newVault, sessionKey)
    
    vaultState.vault = newVault
    vaultState.lastActivity = Date.now()
    
    const entry = newVault.entries.find((e) => e.id === id)
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
    if (!sessionKey || !vaultState.vault) {
      return { success: false, error: "Vault is locked" }
    }
    
    const newVault = deleteEntry(vaultState.vault, id)
    await saveVault(newVault, sessionKey)
    
    vaultState.vault = newVault
    vaultState.lastActivity = Date.now()
    
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete entry"
    }
  }
}

export async function handleSearchEntries(query: string): Promise<MessageResponse<VaultEntry[]>> {
  try {
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

export async function handleImportVault(data: string): Promise<MessageResponse<Vault>> {
  try {
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

export async function handleUpdateSettings(settings: Partial<Vault["settings"]>): Promise<MessageResponse> {
  try {
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

export { vaultState }