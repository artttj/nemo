export interface VaultEntry {
  id: string
  title: string
  username?: string
  password?: string
  url?: string
  notes?: string
  createdAt: number
  updatedAt: number
  tags?: string[]
  favorite?: boolean
  favicon?: string
}

export interface VaultSettings {
  autoLockMinutes: number
  theme: "light" | "dark" | "system"
  lastUnlockedAt?: number
}

export interface VaultMetadata {
  version: string
  vaultId: string
  createdAt: number
  updatedAt: number
  salt: string
  rpId: string
}

export interface EncryptedVaultData {
  ciphertext: string
  iv: string
  authTag: string
}

export interface Vault {
  entries: VaultEntry[]
  settings: VaultSettings
}

export interface VaultState {
  isUnlocked: boolean
  vault: Vault | null
  metadata: VaultMetadata | null
  lastActivity: number
}

export type MessageType =
  | "GET_VAULT_STATE"
  | "UNLOCK_VAULT"
  | "LOCK_VAULT"
  | "CREATE_VAULT"
  | "ADD_ENTRY"
  | "UPDATE_ENTRY"
  | "DELETE_ENTRY"
  | "GET_ENTRIES"
  | "SEARCH_ENTRIES"
  | "COPY_TO_CLIPBOARD"
  | "EXPORT_VAULT"
  | "IMPORT_VAULT"
  | "GET_ENTRY_BY_URL"
  | "UPDATE_SETTINGS"
  | "WEBAUTHN_REGISTER"
  | "WEBAUTHN_AUTHENTICATE"
  | "WEBAUTHN_IS_SUPPORTED"
  | "WEBAUTHN_RESULT"

export interface Message<T = unknown> {
  type: MessageType
  payload?: T
}

export interface MessageResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface AddEntryPayload {
  title: string
  username?: string
  password?: string
  url?: string
  notes?: string
  tags?: string[]
}

export interface UpdateEntryPayload {
  id: string
  updates: Partial<VaultEntry>
}

export interface SearchPayload {
  query: string
}

export interface ClipboardPayload {
  text: string
  clearAfter?: number
}

export interface ImportVaultPayload {
  data: string
  password?: string
}

export interface CreateVaultPayload {
  vaultName?: string
}