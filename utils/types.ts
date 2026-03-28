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
  name: string
  createdAt: number
  updatedAt: number
  salt: string
  rpId: string
}

export interface VaultInfo {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  entryCount: number
}

export interface VaultRegistry {
  vaults: VaultInfo[]
  activeVaultId: string | null
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
  | "CHECK_VAULT_EXISTS"
  | "GET_VAULT_REGISTRY"
  | "SET_ACTIVE_VAULT"
  | "CREATE_NEW_VAULT"
  | "RENAME_VAULT"
  | "DELETE_VAULT"
  | "UNLOCK_VAULT"
  | "UNLOCK_VAULT_FROM_RECOVERY"
  | "UNLOCK_VAULT_WITH_PIN"
  | "LOCK_VAULT"
  | "CREATE_VAULT"
  | "CREATE_VAULT_FROM_RECOVERY"
  | "ADD_ENTRY"
  | "UPDATE_ENTRY"
  | "DELETE_ENTRY"
  | "GET_ENTRIES"
  | "GET_ENTRIES_FOR_AUTOFILL"
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
  | "HAS_PIN_SETUP"
  | "GET_PIN_LENGTH"
  | "SETUP_VAULT_PIN"
  | "REMOVE_VAULT_PIN"

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