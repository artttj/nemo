

export type { VaultData, VaultVersion, VaultEntry, VaultDevice, VaultSettings } from "./types";
export type { EncryptedVault, VaultMetadata, RecoveryData, VaultStorage } from "./types";
export type { CloudflareD1Config, SyncStatus, SyncResult, Syncable } from "./types";
export type { Migration } from "./types";

export { Vault } from "./vault";
export { VaultManager } from "./manager";
export type { KeyStorage, WrappedKeyData } from "./key-storage";
export { OPFSKeyStorage } from "./key-storage";
export { VaultStorageManager, LocalStorageAdapter, RemoteStorageAdapter, CloudflareD1Adapter, isSyncable } from "./storage";
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
