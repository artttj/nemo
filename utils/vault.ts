import type { Vault, VaultMetadata, VaultEntry } from "./types"
import { encrypt, decrypt, generateSalt, generateUUID, generateVaultKey, wrapVaultKey, unwrapVaultKey } from "./crypto"

const VAULT_DIR = "nemo-vault"
const VAULT_FILE = "vault.enc"
const METADATA_FILE = "metadata.json"
const WRAPPED_KEY_FILE = "key.enc"

let opfsRoot: FileSystemDirectoryHandle | null = null

async function getOPFSRoot(): Promise<FileSystemDirectoryHandle> {
  if (!opfsRoot) {
    opfsRoot = await navigator.storage.getDirectory()
  }
  return opfsRoot
}

async function getVaultDirectory(create = true): Promise<FileSystemDirectoryHandle | null> {
  try {
    const root = await getOPFSRoot()
    if (create) {
      return await root.getDirectoryHandle(VAULT_DIR, { create: true })
    }
    return await root.getDirectoryHandle(VAULT_DIR)
  } catch {
    return null
  }
}

export async function vaultExists(): Promise<boolean> {
  const dir = await getVaultDirectory(false)
  if (!dir) return false
  try {
    await dir.getFileHandle(VAULT_FILE)
    return true
  } catch {
    return false
  }
}

export async function initializeVault(wrappingKey: CryptoKey, salt: string): Promise<{ metadata: VaultMetadata; vaultKey: CryptoKey }> {
  const dir = await getVaultDirectory(true)
  if (!dir) throw new Error("Failed to create vault directory")
  
  const vaultKey = await generateVaultKey()
  const vaultId = generateUUID()
  
  const { wrappedKey, iv: keyIv } = await wrapVaultKey(vaultKey, wrappingKey)
  
  const metadata: VaultMetadata = {
    version: "1.0.0",
    vaultId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    salt,
    rpId: "nemo.local"
  }

  const initialVault: Vault = {
    entries: [],
    settings: {
      autoLockMinutes: 5,
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

  return { metadata, vaultKey }
}

export async function loadVaultMetadata(): Promise<VaultMetadata | null> {
  const dir = await getVaultDirectory(false)
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
  const dir = await getVaultDirectory(false)
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
  const dir = await getVaultDirectory(false)
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
  const dir = await getVaultDirectory(true)
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

  const dir = await getVaultDirectory(true)
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

export function updateEntry(vault: Vault, id: string, updates: Partial<VaultEntry>): Vault {
  return {
    ...vault,
    entries: vault.entries.map((entry: VaultEntry) =>
      entry.id === id ? { ...entry, ...updates, updatedAt: Date.now() } : entry
    )
  }
}

export function deleteEntry(vault: Vault, id: string): Vault {
  return {
    ...vault,
    entries: vault.entries.filter((entry: VaultEntry) => entry.id !== id)
  }
}

export function searchEntries(vault: Vault, query: string): VaultEntry[] {
  const lowerQuery = query.toLowerCase()
  return vault.entries.filter((entry: VaultEntry) =>
    entry.title.toLowerCase().includes(lowerQuery) ||
    entry.username.toLowerCase().includes(lowerQuery) ||
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
        return hostname === entryHostname || hostname.endsWith(entryHostname)
      } catch {
        return false
      }
    })
  } catch {
    return undefined
  }
}

export function getFaviconUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`
  } catch {
    return null
  }
}

function bufferToBase64(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
}