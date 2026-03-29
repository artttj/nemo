/**
 * Copyright 2024-2025 Artem Iagovdik <artyom.yagovdik@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

export type { VaultData, VaultVersion, VaultEntry, VaultDevice, VaultSettings } from "./types";
export type { EncryptedVault, VaultMetadata, RecoveryData, VaultStorage } from "./types";
export type { Migration } from "./types";

export { Vault } from "./vault";
export { VaultManager } from "./manager";
export { VaultStorageManager, LocalStorageAdapter, RemoteStorageAdapter } from "./storage";
export {
  generateSalt,
  generateVaultKey,
  deriveKeyFromPassword,
  deriveWrappingKeyFromPrf,
  wrapVaultKey,
  unwrapVaultKey,
  encryptVault,
  decryptVault,
  bufferToBase64,
  base64ToBuffer,
  generateUUID,
  generateRandomBytes,
  wipeKey,
  type KDFType,
  type KeyDerivationParams
} from "./crypto";
export {
  generateRecoveryPhrase,
  createRecoveryBackup,
  recoverVaultKey,
  isValidPhrase
} from "./recovery";
