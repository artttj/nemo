

import type { Vault, VaultMetadata, VaultEntry, VaultInfo, VaultRegistry, EntryHistory } from "./types"
import type { RecoveryData } from "../vault/types"
import { encrypt, decrypt, generateSalt, generateUUID, generateVaultKey, wrapVaultKey, unwrapVaultKey, bufferToBase64 } from "./crypto"

const VAULT_PREFIX = "nemo-vault-"
const REGISTRY_FILE = "vault-registry.json"
const VAULT_FILE = "vault.enc"
const METADATA_FILE = "metadata.json"
const WRAPPED_KEY_FILE = "key.enc"
const RECOVERY_FILE = "recovery.enc"

let opfsRoot: FileSystemDirectoryHandle | null = null
let activeVaultId: string | null = null
let saveLock: Promise<void> = Promise.resolve()

async function getOPFSRoot(): Promise<FileSystemDirectoryHandle> {
  if (!opfsRoot) {
    opfsRoot = await navigator.storage.getDirectory()
  }
  return opfsRoot
}

function getVaultDirName(vaultId: string): string {
  return `${VAULT_PREFIX}${vaultId}`
}

async function getVaultDirectory(vaultId?: string, create = true): Promise<FileSystemDirectoryHandle | null> {
  try {
    const root = await getOPFSRoot()
    const targetId = vaultId || activeVaultId
    if (!targetId) {
      return null
    }

    const dirName = getVaultDirName(targetId)
    if (create) {
      return await root.getDirectoryHandle(dirName, { create: true })
    }
    return await root.getDirectoryHandle(dirName)
  } catch {
    return null
  }
}

async function loadRegistry(): Promise<VaultRegistry> {
  try {
    const root = await getOPFSRoot()
    const file = await root.getFileHandle(REGISTRY_FILE)
    const blob = await file.getFile()
    const text = await blob.text()
    const registry = JSON.parse(text) as VaultRegistry

    if (registry.activeVaultId) {
      activeVaultId = registry.activeVaultId
    }

    return registry
  } catch {
    return { vaults: [], activeVaultId: null }
  }
}

async function saveRegistry(registry: VaultRegistry): Promise<void> {
  const root = await getOPFSRoot()
  const file = await root.getFileHandle(REGISTRY_FILE, { create: true })
  const writer = await file.createWritable()
  await writer.write(JSON.stringify(registry, null, 2))
  await writer.close()
}

export async function getVaultRegistry(): Promise<VaultRegistry> {
  return loadRegistry()
}

export async function setActiveVault(vaultId: string): Promise<boolean> {
  const registry = await loadRegistry()
  const vault = registry.vaults.find(v => v.id === vaultId)
  if (!vault) return false
  
  activeVaultId = vaultId
  registry.activeVaultId = vaultId
  await saveRegistry(registry)
  return true
}

export async function getActiveVaultId(): Promise<string | null> {
  if (activeVaultId) return activeVaultId
  
  const registry = await loadRegistry()
  return registry.activeVaultId
}

export async function listVaults(): Promise<VaultInfo[]> {
  const registry = await loadRegistry()
  return registry.vaults
}

export async function createNewVault(name: string, vaultKey?: CryptoKey): Promise<{ vaultId: string; metadata: VaultMetadata }> {
  const registry = await loadRegistry()
  const vaultId = generateUUID()
  const vaultDirName = getVaultDirName(vaultId)

  const root = await getOPFSRoot()
  const vaultDir = await root.getDirectoryHandle(vaultDirName, { create: true })

  const vaultInfo: VaultInfo = {
    id: vaultId,
    name: name || `Vault ${registry.vaults.length + 1}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    entryCount: 0
  }

  registry.vaults.push(vaultInfo)

  if (!registry.activeVaultId) {
    registry.activeVaultId = vaultId
    activeVaultId = vaultId
  }

  await saveRegistry(registry)

  const salt = await generateSalt()
  const metadata: VaultMetadata = {
    version: "1.0.0",
    vaultId,
    name: vaultInfo.name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    salt,
    rpId: "nemo.local"
  }

  if (vaultKey) {
    const wrappingKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["wrapKey", "unwrapKey"]
    )

    const { wrappedKey, iv: keyIv } = await wrapVaultKey(vaultKey, wrappingKey)

    const initialVault: Vault = {
      entries: [],
      settings: {
        autoLockMinutes: 15,
        theme: "dark"
      }
    }

    const { ciphertext, iv } = await encrypt(JSON.stringify(initialVault), vaultKey)

    const metadataFile = await vaultDir.getFileHandle(METADATA_FILE, { create: true })
    const metadataWriter = await metadataFile.createWritable()
    await metadataWriter.write(JSON.stringify(metadata, null, 2))
    await metadataWriter.close()

    const vaultFile = await vaultDir.getFileHandle(VAULT_FILE, { create: true })
    const vaultWriter = await vaultFile.createWritable()
    await vaultWriter.write(JSON.stringify({ ciphertext, iv }))
    await vaultWriter.close()

    const wrappedKeyFile = await vaultDir.getFileHandle(WRAPPED_KEY_FILE, { create: true })
    const wrappedKeyWriter = await wrappedKeyFile.createWritable()
    await wrappedKeyWriter.write(JSON.stringify({ wrappedKey, keyIv }))
    await wrappedKeyWriter.close()
  }

  return { vaultId, metadata }
}

export async function renameVault(vaultId: string, newName: string): Promise<boolean> {
  const registry = await loadRegistry()
  const vault = registry.vaults.find(v => v.id === vaultId)
  if (!vault) return false
  
  vault.name = newName
  vault.updatedAt = Date.now()
  await saveRegistry(registry)
  return true
}

export async function deleteVaultFromRegistry(vaultId: string): Promise<boolean> {
  const registry = await loadRegistry()
  const index = registry.vaults.findIndex(v => v.id === vaultId)
  if (index === -1) return false
  
  registry.vaults.splice(index, 1)
  
  if (registry.activeVaultId === vaultId) {
    registry.activeVaultId = registry.vaults[0]?.id || null
    activeVaultId = registry.activeVaultId
  }
  
  await saveRegistry(registry)
  
  try {
    const root = await getOPFSRoot()
    const dirName = getVaultDirName(vaultId)
    await root.removeEntry(dirName, { recursive: true })
  } catch {
    
  }
  
  return true
}

async function scanForVaults(): Promise<string[]> {
  try {
    const root = await getOPFSRoot()
    const vaults: string[] = []
    for await (const entry of root.values()) {
      if (entry.kind === 'directory' && entry.name.startsWith(VAULT_PREFIX)) {
        const vaultId = entry.name.slice(VAULT_PREFIX.length)
        try {
          const dir = await root.getDirectoryHandle(entry.name)
          await dir.getFileHandle(VAULT_FILE)
          vaults.push(vaultId)
        } catch {
        }
      }
    }
    return vaults
  } catch {
    return []
  }
}

export async function vaultExists(): Promise<boolean> {
  const activeId = await getActiveVaultId()
  if (activeId) {
    const dir = await getVaultDirectory(activeId, false)
    if (dir) {
      try {
        await dir.getFileHandle(VAULT_FILE)
        return true
      } catch {
      }
    }
  }

  const foundVaults = await scanForVaults()
  if (foundVaults.length > 0) {
    const registry = await loadRegistry()
    if (!registry.activeVaultId || !foundVaults.includes(registry.activeVaultId)) {
      registry.activeVaultId = foundVaults[0]
      await saveRegistry(registry)
    }
    return true
  }

  return false
}

export async function initializeVault(wrappingKey: CryptoKey, salt: string, vaultName?: string): Promise<{ metadata: VaultMetadata; vaultKey: CryptoKey }> {
  const { vaultId, metadata: newVaultMetadata } = await createNewVault(vaultName || "Personal")
  
  const dir = await getVaultDirectory(vaultId, true)
  if (!dir) throw new Error("Failed to create vault directory")
  
  const vaultKey = await generateVaultKey()
  
  const { wrappedKey, iv: keyIv } = await wrapVaultKey(vaultKey, wrappingKey)
  
  const metadata: VaultMetadata = {
    version: "1.0.0",
    vaultId,
    name: vaultName || "Personal",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    salt,
    rpId: "nemo.local"
  }

  const initialVault: Vault = {
    entries: [],
    settings: {
      autoLockMinutes: 15,
      theme: "dark"
    }
  }

  const { ciphertext, iv } = await encrypt(JSON.stringify(initialVault), vaultKey)

  const metadataFile = await dir.getFileHandle(METADATA_FILE, { create: true })
  const metadataWriter = await metadataFile.createWritable()
  await metadataWriter.write(JSON.stringify(metadata, null, 2))
  await metadataWriter.close()

  const vaultFile = await dir.getFileHandle(VAULT_FILE, { create: true })
  const vaultWriter = await vaultFile.createWritable()
  await vaultWriter.write(JSON.stringify({ ciphertext, iv }))
  await vaultWriter.close()

  const wrappedKeyFile = await dir.getFileHandle(WRAPPED_KEY_FILE, { create: true })
  const wrappedKeyWriter = await wrappedKeyFile.createWritable()
  await wrappedKeyWriter.write(JSON.stringify({ wrappedKey, keyIv }))
  await wrappedKeyWriter.close()
  
  activeVaultId = vaultId

  return { metadata, vaultKey }
}

export async function loadVaultMetadata(): Promise<VaultMetadata | null> {
  const activeId = await getActiveVaultId()
  if (!activeId) return null
  
  const dir = await getVaultDirectory(activeId, false)
  if (!dir) return null

  try {
    const file = await dir.getFileHandle(METADATA_FILE)
    const blob = await file.getFile()
    const text = await blob.text()
    return JSON.parse(text) as VaultMetadata
  } catch {
    return null
  }
}

export async function loadVaultKey(wrappingKey: CryptoKey): Promise<CryptoKey | null> {
  const activeId = await getActiveVaultId()
  if (!activeId) return null
  
  const dir = await getVaultDirectory(activeId, false)
  if (!dir) return null

  try {
    const file = await dir.getFileHandle(WRAPPED_KEY_FILE)
    const blob = await file.getFile()
    const text = await blob.text()
    const { wrappedKey, keyIv } = JSON.parse(text)
    
    return await unwrapVaultKey(wrappedKey, keyIv, wrappingKey)
  } catch {
    return null
  }
}

export async function loadVault(key: CryptoKey): Promise<Vault | null> {
  const activeId = await getActiveVaultId()
  if (!activeId) return null
  
  const dir = await getVaultDirectory(activeId, false)
  if (!dir) return null

  try {
    const file = await dir.getFileHandle(VAULT_FILE)
    const blob = await file.getFile()
    const text = await blob.text()
    const { ciphertext, iv } = JSON.parse(text)
    
    const decrypted = await decrypt(ciphertext, iv, key)
    return JSON.parse(decrypted) as Vault
  } catch {
    return null
  }
}

export async function saveVault(vault: Vault, key: CryptoKey): Promise<void> {
  const doSave = async () => {
    const activeId = await getActiveVaultId()
    if (!activeId) throw new Error("No active vault")

    const dir = await getVaultDirectory(activeId, true)
    if (!dir) throw new Error("Failed to access vault directory")

    const { ciphertext, iv } = await encrypt(JSON.stringify(vault), key)

    const vaultFile = await dir.getFileHandle(VAULT_FILE, { create: true })
    const writer = await vaultFile.createWritable()
    await writer.write(JSON.stringify({ ciphertext, iv }))
    await writer.close()

    const metadataFile = await dir.getFileHandle(METADATA_FILE, { create: true })
    const metadataBlob = await metadataFile.getFile()
    const metadataText = await metadataBlob.text()
    const metadata = JSON.parse(metadataText) as VaultMetadata
    metadata.updatedAt = Date.now()

    const metadataWriter = await metadataFile.createWritable()
    await metadataWriter.write(JSON.stringify(metadata, null, 2))
    await metadataWriter.close()

    const registry = await loadRegistry()
    const vaultInfo = registry.vaults.find(v => v.id === activeId)
    if (vaultInfo) {
      vaultInfo.entryCount = vault.entries.length
      vaultInfo.updatedAt = Date.now()
      await saveRegistry(registry)
    }
  }

  saveLock = saveLock.then(doSave, doSave)
  return saveLock
}

export async function exportVault(key: CryptoKey): Promise<string> {
  const vault = await loadVault(key)
  if (!vault) throw new Error("No vault found")
  
  const metadata = await loadVaultMetadata()
  if (!metadata) throw new Error("No metadata found")

  const { ciphertext, iv } = await encrypt(JSON.stringify({
    vault,
    metadata
  }), key)

  return JSON.stringify({
    version: "1.0.0",
    exportedAt: Date.now(),
    data: { ciphertext, iv }
  })
}

export async function importVault(
  exportedData: string,
  key: CryptoKey
): Promise<{ vault: Vault; metadata: VaultMetadata }> {
  const parsed = JSON.parse(exportedData)

  if (!parsed.data?.ciphertext || !parsed.data?.iv) {
    throw new Error("Invalid backup format")
  }

  const decrypted = await decrypt(parsed.data.ciphertext, parsed.data.iv, key)
  const { vault, metadata } = JSON.parse(decrypted)

  if (!metadata?.vaultId || typeof metadata.vaultId !== 'string' ||
      !metadata?.name || typeof metadata.name !== 'string' ||
      typeof metadata?.createdAt !== 'number' ||
      typeof metadata?.updatedAt !== 'number' ||
      typeof metadata?.version !== 'string' ||
      typeof metadata?.salt !== 'string') {
    throw new Error('Invalid or corrupted backup metadata')
  }

  if (!Array.isArray(vault?.entries)) {
    throw new Error('Invalid vault data')
  }

  const activeId = await getActiveVaultId()
  if (!activeId) throw new Error("No active vault")

  const dir = await getVaultDirectory(activeId, true)
  if (!dir) throw new Error("Failed to access vault directory")

  const vaultFile = await dir.getFileHandle(VAULT_FILE, { create: true })
  const vaultWriter = await vaultFile.createWritable()
  await vaultWriter.write(JSON.stringify({
    ciphertext: parsed.data.ciphertext,
    iv: parsed.data.iv
  }))
  await vaultWriter.close()

  const metadataFile = await dir.getFileHandle(METADATA_FILE, { create: true })
  const metadataWriter = await metadataFile.createWritable()
  await metadataWriter.write(JSON.stringify(metadata, null, 2))
  await metadataWriter.close()

  return { vault, metadata }
}

export function addEntry(vault: Vault, entry: Omit<VaultEntry, "id" | "createdAt" | "updatedAt">): Vault {
  const newEntry: VaultEntry = {
    ...entry,
    id: generateUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  return {
    ...vault,
    entries: [...vault.entries, newEntry]
  }
}

function createHistorySnapshot(entry: VaultEntry): EntryHistory[] {
  const { history: currentHistory, ...entryWithoutHistory } = entry
  const previousVersions = currentHistory || []
  const newVersion: EntryHistory = {
    version: previousVersions.length + 1,
    data: { ...entryWithoutHistory },
    changedAt: Date.now()
  }
  return [newVersion, ...previousVersions].slice(0, 5)
}

export function updateEntry(vault: Vault, id: string, updates: Partial<VaultEntry>): Vault {
  return {
    ...vault,
    entries: vault.entries.map((entry: VaultEntry) => {
      if (entry.id !== id) return entry
      return {
        ...entry,
        ...updates,
        updatedAt: Date.now(),
        history: createHistorySnapshot(entry)
      }
    })
  }
}

export function deleteEntry(vault: Vault, id: string): Vault {
  return {
    ...vault,
    entries: vault.entries.filter((entry: VaultEntry) => entry.id !== id)
  }
}

export function restoreEntryVersion(vault: Vault, entryId: string, version: number): Vault {
  return {
    ...vault,
    entries: vault.entries.map((entry: VaultEntry) => {
      if (entry.id !== entryId) return entry

      const versionToRestore = entry.history?.find(h => h.version === version)
      if (!versionToRestore) return entry

      return {
        ...versionToRestore.data,
        id: entry.id,
        updatedAt: Date.now(),
        history: createHistorySnapshot(entry)
      }
    })
  }
}

export function searchEntries(vault: Vault, query: string): VaultEntry[] {
  const lowerQuery = query.toLowerCase()
  return vault.entries.filter((entry: VaultEntry) =>
    entry.title.toLowerCase().includes(lowerQuery) ||
    (entry.username?.toLowerCase().includes(lowerQuery) ?? false) ||
    (entry.url?.toLowerCase().includes(lowerQuery) ?? false) ||
    (entry.tags?.some((tag: string) => tag.toLowerCase().includes(lowerQuery)) ?? false)
  )
}

export function getEntryByUrl(vault: Vault, url: string): VaultEntry | undefined {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.replace(/^www\./, "")

    return vault.entries.find((entry: VaultEntry) => {
      if (!entry.url) return false
      try {
        const entryUrl = new URL(entry.url)
        const entryHostname = entryUrl.hostname.replace(/^www\./, "")
        return hostname === entryHostname || hostname.endsWith('.' + entryHostname)
      } catch {
        return false
      }
    })
  } catch {
    return undefined
  }
}

export function getEntriesByUrl(vault: Vault, url: string): VaultEntry[] {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.replace(/^www\./, "")

    return vault.entries.filter((entry: VaultEntry) => {
      if (!entry.url) return false
      try {
        const entryUrl = new URL(entry.url)
        const entryHostname = entryUrl.hostname.replace(/^www\./, "")
        return hostname === entryHostname || hostname.endsWith('.' + entryHostname)
      } catch {
        return false
      }
    })
  } catch {
    return []
  }
}

export function getFaviconUrl(url: string | undefined, size = 32): string | null {
  if (!url) return null
  try {
    const { hostname } = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=${size}`
  } catch {
    return null
  }
}

export async function storeRecoveryData(data: RecoveryData): Promise<void> {
  const activeId = await getActiveVaultId()
  if (!activeId) throw new Error("No active vault")
  const dir = await getVaultDirectory(activeId, true)
  if (!dir) throw new Error("Failed to access vault directory")
  const file = await dir.getFileHandle(RECOVERY_FILE, { create: true })
  const writer = await file.createWritable()
  await writer.write(JSON.stringify(data, null, 2))
  await writer.close()
}

export async function loadRecoveryData(): Promise<RecoveryData | null> {
  const activeId = await getActiveVaultId()
  if (!activeId) return null
  const dir = await getVaultDirectory(activeId, false)
  if (!dir) return null
  try {
    const file = await dir.getFileHandle(RECOVERY_FILE)
    const blob = await file.getFile()
    const text = await blob.text()
    return JSON.parse(text) as RecoveryData
  } catch {
    return null
  }
}
