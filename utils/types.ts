

export interface TOTPConfig {
  secret: string
  digits?: number
  period?: number
  algorithm?: 'SHA-1' | 'SHA-256' | 'SHA-512'
  issuer?: string
  accountName?: string
}

export interface EntryHistory {
  version: number
  data: Omit<VaultEntry, 'history'>
  changedAt: number
}

export interface VaultEntry {
  id: string
  title: string
  username?: string
  password?: string
  url?: string
  notes?: string
  totp?: TOTPConfig
  createdAt: number
  updatedAt: number
  tags?: string[]
  favorite?: boolean
  favicon?: string
  history?: EntryHistory[]
}

export interface SitePreferences {
  hostname: string
  autoFillMode: 'always' | 'never' | 'ask'
  defaultUsername?: string
  preferredEntryId?: string
  quickAddDisabled?: boolean
  createdAt: number
  updatedAt: number
}

export interface VaultSettings {
  autoLockMinutes: number
  theme: "light" | "dark" | "system"
  lastUnlockedAt?: number
  sitePreferences?: Record<string, SitePreferences>
  recoveryPhraseVerifiedAt?: number
  recoveryPhraseReminderDismissedAt?: number
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
  | "EXPORT_VAULT_NEMX"
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
  | "GENERATE_RECOVERY_PHRASE"
  | "CREATE_VAULT_WITH_OPTIONS"
  | "RESTORE_ENTRY_VERSION"
  | "GET_SITE_PREFERENCES"
  | "SET_SITE_PREFERENCES"
  | "DELETE_SITE_PREFERENCES"
  | "TEST_CLOUDFLARE_CONNECTION"
  | "ENABLE_CLOUDFLARE_SYNC"
  | "DISABLE_CLOUDFLARE_SYNC"
  | "GET_SYNC_STATUS"
  | "TRIGGER_SYNC"
  | "TEST_CUSTOM_BACKEND_CONNECTION"
  | "ENABLE_CUSTOM_BACKEND_SYNC"
  | "DISABLE_CUSTOM_BACKEND_SYNC"
  | "GET_CUSTOM_BACKEND_SYNC_STATUS"
  | "TRIGGER_CUSTOM_BACKEND_SYNC"
  | "VERIFY_RECOVERY_PHRASE"
  | "GET_RECOVERY_STATUS"
  | "UPDATE_RECOVERY_VERIFIED"
  | "DISMISS_RECOVERY_REMINDER"
  | "SHOULD_SHOW_BACKUP_REMINDER"
  | "MARK_BACKUP_REMINDER_SHOWN"
  | "RESET_BACKUP_REMINDER"
  | "CHECK_GOOGLE_DRIVE_AUTH"
  | "SIGN_IN_GOOGLE_DRIVE"
  | "SIGN_OUT_GOOGLE_DRIVE"
  | "BACKUP_TO_GOOGLE_DRIVE"
  | "LIST_GOOGLE_DRIVE_BACKUPS"
  | "RESTORE_FROM_GOOGLE_DRIVE"
  | "DELETE_GOOGLE_DRIVE_BACKUP"
  | "GET_GOOGLE_DRIVE_BACKUP_STATUS"

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
  totp?: TOTPConfig
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

export interface ExportVaultPayload {
  format?: "nemx" | "csv"
}

export interface CreateVaultPayload {
  vaultName?: string
}

export interface RestoreVersionPayload {
  entryId: string
  version: number
}

export interface SitePreferencesPayload {
  hostname: string
  preferences: Omit<SitePreferences, 'hostname' | 'createdAt' | 'updatedAt'>
}
