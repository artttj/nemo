declare(strict_types=1);

export type { VaultData, VaultVersion, VaultEntry, VaultDevice, VaultSettings } from "./types";
export type { EncryptedVault, VaultMetadata, RecoveryData } from "./types";
export type { VaultStorage } from "./storage";
export type { Migration } from "./types";
export type { ConflictInfo, ConflictResolution } from "./vault";

export { Vault, VaultBuilder, migrateVault, getCurrentVersion } from "./vault";
export { VaultManager } from "./manager";
export { VaultStorageManager, LocalStorageAdapter, RemoteStorageAdapter } from "./storage";
export {
  generateSalt,
  generateVaultKey,
  deriveKeyFromPassword,
  wrapVaultKey,
  unwrapVaultKey,
  encryptVault,
  decryptVault,
  bufferToBase64,
  base64ToBuffer,
  generateUUID,
  generateRandomBytes,
  hashPassword,
  type KDFType,
  type KeyDerivationParams
} from "./crypto";
export {
  generateRecoveryPhrase,
  createRecoveryBackup,
  recoverVaultKey,
  validateRecoveryPhraseChecksum,
  wordlistSize,
  phraseWordCount,
  entropyStrength
} from "./recovery";
