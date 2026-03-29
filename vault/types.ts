/**
 * Copyright 2024-2025 Artem Iagovdik <artyom.yagovdik@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

export type VaultVersion = 1;

export interface VaultDevice {
  id: string
  name: string
  createdAt: number
  lastSeen: number
}

export interface VaultEntry {
  id: string
  title: string
  username?: string
  password?: string
  url?: string
  notes?: string
  createdAt: number
  updatedAt: number
  deviceId: string
  tags?: string[]
  favorite?: boolean
  favicon?: string
}

export interface VaultSettings {
  autoLockMinutes: number
  theme: "light" | "dark" | "system"
  lastUnlockedAt?: number
}

export interface VaultData {
  version: VaultVersion
  vaultId: string
  createdAt: number
  updatedAt: number
  deviceId: string
  entries: VaultEntry[]
  settings: VaultSettings
  devices?: VaultDevice[]
}

export interface EncryptedVault {
  kdf: "argon2id" | "pbkdf2"
  salt: string
  iv: string
  ciphertext: string
  version: VaultVersion
}

export interface VaultMetadata {
  version: VaultVersion
  vaultId: string
  createdAt: number
  updatedAt: number
  deviceId: string
  salt: string
  kdf: "argon2id" | "pbkdf2"
}

export interface RecoveryData {
  version: 1
  vaultId: string
  wrappedVaultKey: string
  salt: string
  iv: string
  createdAt: number
}

export interface EncryptedRecoveryKey {
  phraseIndex: number
  wrappedKey: string
  iv: string
  salt: string
}

export interface VaultStorage {
  load(): Promise<EncryptedVault | null>
  save(vault: EncryptedVault): Promise<void>
  loadMetadata(): Promise<VaultMetadata | null>
  saveMetadata(metadata: VaultMetadata): Promise<void>
  exists(): Promise<boolean>
}

export interface KeyBackup {
  recoveryPhrase: string
  createdAt: number
}

export interface Migration<T = unknown, U = unknown> {
  version: number
  migrate(data: T): U
}

export interface PinData {
  version: 1
  wrappedVaultKey: string
  iv: string
  salt: string
  createdAt: number
  attemptsRemaining: number
  lockedUntil: number | null
  pinLength: number
}
