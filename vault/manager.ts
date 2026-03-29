

import type { VaultData, EncryptedVault, VaultMetadata, RecoveryData, VaultDevice, VaultStorage } from "./types";
import { Vault } from "./vault";
import { generateVaultKey, wrapVaultKey, unwrapVaultKey, generateSalt, type KDFType, wipeKey } from "./crypto";
import { VaultStorageManager, LocalStorageAdapter, RemoteStorageAdapter } from "./storage";
import { createRecoveryBackup, recoverVaultKey, isValidPhrase } from "./recovery";

export interface VaultManagerConfig {
  storage?: VaultStorage;
  kdf?: KDFType;
}

export interface UnlockParams {
  password?: string;
  recoveryPhrase?: string;
  webAuthnWrappingKey?: CryptoKey;
  recoveryData?: RecoveryData;
}

export class VaultManager {
  private storage: VaultStorageManager;
  private vaultKey: CryptoKey | null = null;
  private vault: Vault | null = null;
  private kdf: KDFType;

  constructor(config: VaultManagerConfig = {}) {
    this.storage = config.storage
      ? new VaultStorageManager(config.storage)
      : VaultStorageManager.createLocal();
    this.kdf = config.kdf ?? "pbkdf2";
  }

  async exists(): Promise<boolean> {
    return await this.storage.exists();
  }

  async loadMetadata(): Promise<VaultMetadata | null> {
    return await this.storage.loadMetadata();
  }

  async create(password: string, deviceName: string = "Current Device"): Promise<Vault> {
    if (await this.exists()) {
      throw new Error("Vault already exists");
    }

    const salt = await generateSalt();
    const vaultKey = await generateVaultKey();

    const vault = Vault.createEmpty();
    vault.registerDevice(deviceName);

    const encrypted = await this.encryptVault(vault.toJSON(), vaultKey, salt);
    const metadata = this.createMetadata(vault, salt);

    await this.storage.save(encrypted);
    await this.storage.saveMetadata(metadata);

    await this.saveWrappedKey(password, salt, vaultKey);

    this.vaultKey = vaultKey;
    this.vault = vault;

    return vault;
  }

  async unlock(params: UnlockParams): Promise<Vault> {
    const metadata = await this.storage.loadMetadata();
    if (!metadata) {
      throw new Error("Vault metadata not found");
    }

    if (params.password) {
      const { deriveKeyFromPassword } = await import("./crypto");
      const wrappingKey = await deriveKeyFromPassword(params.password, {
        type: metadata.kdf,
        salt: metadata.salt
      });

      const wrappedKeyData = await this.loadWrappedKey();
      if (!wrappedKeyData) {
        throw new Error("Wrapped vault key not found. Password unlock not available.");
      }

      this.vaultKey = await unwrapVaultKey(wrappedKeyData.wrappedKey, wrappedKeyData.iv, wrappingKey);
    } else if (params.webAuthnWrappingKey) {
      const wrappedKeyData = await this.loadWrappedKey();
      if (!wrappedKeyData) {
        throw new Error("Wrapped vault key not found");
      }
      this.vaultKey = await unwrapVaultKey(wrappedKeyData.wrappedKey, wrappedKeyData.iv, params.webAuthnWrappingKey);
    } else if (params.recoveryPhrase && params.recoveryData) {
      this.vaultKey = await recoverVaultKey(params.recoveryPhrase, params.recoveryData);
    } else {
      throw new Error("No valid unlock method provided");
    }

    const encrypted = await this.storage.load();
    if (!encrypted) {
      throw new Error("Encrypted vault not found");
    }

    const { decryptVault } = await import("./crypto");
    const vaultData = await decryptVault(encrypted, this.vaultKey);
    this.vault = new Vault(vaultData);

    return this.vault;
  }

  isUnlocked(): boolean {
    return this.vault !== null && this.vaultKey !== null;
  }

  getVault(): Vault | null {
    return this.vault;
  }

  async save(): Promise<void> {
    if (!this.vault || !this.vaultKey) {
      throw new Error("Vault not unlocked");
    }

    const metadata = await this.storage.loadMetadata();
    const salt = metadata?.salt ?? await generateSalt();

    const encrypted = await this.encryptVault(this.vault.toJSON(), this.vaultKey, salt);
    await this.storage.save(encrypted);
    await this.storage.saveMetadata(this.createMetadata(this.vault, salt));
  }

  async lock(): Promise<void> {
    if (this.vaultKey) {
      await wipeKey(this.vaultKey);
    }
    this.vaultKey = null;
    this.vault = null;
  }

  async createRecoveryBackup(): Promise<{ phrase: string; encryptedData: RecoveryData }> {
    if (!this.vaultKey) {
      throw new Error("Vault not unlocked");
    }

    return await createRecoveryBackup(this.vaultKey, this.vault!.vaultId);
  }

  async validateRecoveryPhrase(phrase: string): Promise<boolean> {
    return isValidPhrase(phrase)
  }

  async recoverFromPhrase(phrase: string, recoveryData: RecoveryData): Promise<Vault> {
    this.vaultKey = await recoverVaultKey(phrase, recoveryData);

    const encrypted = await this.storage.load();
    if (!encrypted) {
      throw new Error("Encrypted vault not found");
    }

    const { decryptVault } = await import("./crypto");
    const vaultData = await decryptVault(encrypted, this.vaultKey);
    this.vault = new Vault(vaultData);

    return this.vault;
  }

  async exportVault(): Promise<string> {
    if (!this.vault || !this.vaultKey) {
      throw new Error("Vault not unlocked");
    }

    const metadata = await this.storage.loadMetadata();
    const salt = metadata?.salt ?? await generateSalt();
    const { encryptVault } = await import("./crypto");
    const encrypted = await encryptVault(this.vault.toJSON(), this.vaultKey, salt);

    return JSON.stringify({
      version: "1.0.0",
      exportedAt: Date.now(),
      data: encrypted
    }, null, 2);
  }

  async importVault(exportedJson: string, password?: string, recoveryPhrase?: string): Promise<Vault> {
    const exported = JSON.parse(exportedJson);

    if (!exported.data || !exported.data.ciphertext) {
      throw new Error("Invalid export format");
    }

    const encrypted = exported.data as EncryptedVault;
    const salt = encrypted.salt ?? await generateSalt();

    let key: CryptoKey;

    if (password) {
      const { deriveKeyFromPassword } = await import("./crypto");
      key = await deriveKeyFromPassword(password, {
        type: encrypted.kdf ?? this.kdf,
        salt
      });
    } else if (recoveryPhrase && exported.recoveryData) {
      key = await recoverVaultKey(recoveryPhrase, exported.recoveryData as RecoveryData);
    } else {
      throw new Error("Either password or recovery phrase is required");
    }

    const { decryptVault } = await import("./crypto");
    const vaultData = await decryptVault(encrypted, key);

    this.vaultKey = key;
    this.vault = new Vault(vaultData);

    const { encryptVault } = await import("./crypto");
    const vaultEncrypted = await encryptVault(vaultData, key, salt);
    await this.storage.save(vaultEncrypted);
    await this.storage.saveMetadata(this.createMetadata(this.vault, salt));

    return this.vault;
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    if (!this.vault || !this.vaultKey) {
      throw new Error("Vault not unlocked");
    }

    const metadata = await this.storage.loadMetadata();
    if (!metadata) {
      throw new Error("Vault metadata not found");
    }

    const { deriveKeyFromPassword } = await import("./crypto");
    const oldKey = await deriveKeyFromPassword(oldPassword, {
      type: metadata.kdf,
      salt: metadata.salt
    });

    const wrappedKeyData = await this.loadWrappedKey();
    if (!wrappedKeyData) {
      throw new Error("Wrapped vault key not found");
    }

    const unwrapped = await unwrapVaultKey(wrappedKeyData.wrappedKey, wrappedKeyData.iv, oldKey);

    if (JSON.stringify(this.vault.toJSON()) !== JSON.stringify((await this.decryptStored()).toJSON())) {
      await wipeKey(oldKey);
      await wipeKey(unwrapped);
      throw new Error("Old password is incorrect");
    }

    await wipeKey(oldKey);
    await wipeKey(unwrapped);

    const newKey = await deriveKeyFromPassword(newPassword, {
      type: this.kdf,
      salt: metadata.salt
    });

    await this.saveWrappedKey(newPassword, metadata.salt, this.vaultKey);

    await wipeKey(newKey);
  }

  async registerWebAuthn(credentialId: string, prfOutput: string): Promise<void> {
    const metadata = await this.storage.loadMetadata();
    if (!metadata) {
      throw new Error("Vault metadata not found");
    }

    const { deriveWrappingKeyFromPrf, base64ToBuffer } = await import("./crypto");
    const prfBuffer = base64ToBuffer(prfOutput).buffer as ArrayBuffer;
    const wrappingKey = await deriveWrappingKeyFromPrf(prfBuffer, metadata.salt);

    if (!this.vaultKey) {
      throw new Error("Vault not unlocked");
    }

    const { wrappedKey, iv } = await wrapVaultKey(this.vaultKey, wrappingKey);

    await this.saveWrappedVaultKey(credentialId, { wrappedKey, iv });
  }

  async getDevices(): Promise<VaultDevice[]> {
    return [...(this.vault?.devices ?? [])];
  }

  async removeDevice(deviceId: string): Promise<void> {
    if (!this.vault) {
      throw new Error("Vault not unlocked");
    }

    this.vault.removeDevice(deviceId);
    await this.save();
  }

  switchToRemoteStorage(baseUrl: string, authToken?: string): void {
    const adapter = new RemoteStorageAdapter(baseUrl);
    if (authToken) adapter.setAuthToken(authToken);
    this.storage = new VaultStorageManager(adapter);
  }

  switchToLocalStorage(): void {
    this.storage = VaultStorageManager.createLocal();
  }

  private async encryptVault(vaultData: VaultData, key: CryptoKey, salt: string): Promise<EncryptedVault> {
    const { encryptVault } = await import("./crypto");
    return await encryptVault(vaultData, key, salt, this.kdf);
  }

  private async decryptStored(): Promise<Vault> {
    const encrypted = await this.storage.load();
    if (!encrypted) {
      throw new Error("Vault not found");
    }

    const { decryptVault } = await import("./crypto");
    const vaultData = await decryptVault(encrypted, this.vaultKey!);
    return new Vault(vaultData);
  }

  private createMetadata(vault: Vault, salt: string): VaultMetadata {
    return {
      version: vault.version,
      vaultId: vault.vaultId,
      createdAt: vault.toJSON().createdAt,
      updatedAt: Date.now(),
      deviceId: vault.deviceId,
      salt,
      kdf: this.kdf
    };
  }

  private async loadWrappedKey(): Promise<{ wrappedKey: string; iv: string } | null> {
    try {
      const dir = await navigator.storage.getDirectory();
      const vaultDir = await dir.getDirectoryHandle("nemo-vault");
      const file = await vaultDir.getFileHandle("key.enc");
      const blob = await file.getFile();
      const text = await blob.text();
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  private async saveWrappedKey(
    password: string,
    salt: string,
    vaultKey: CryptoKey
  ): Promise<void> {
    const { deriveKeyFromPassword } = await import("./crypto");
    const wrappingKey = await deriveKeyFromPassword(password, {
      type: this.kdf,
      salt
    });

    const { wrappedKey, iv } = await wrapVaultKey(vaultKey, wrappingKey);

    const dir = await navigator.storage.getDirectory();
    const vaultDir = await dir.getDirectoryHandle("nemo-vault", { create: true });
    const file = await vaultDir.getFileHandle("key.enc", { create: true });
    const writer = await file.createWritable();
    await writer.write(JSON.stringify({ wrappedKey, iv }));
    await writer.close();
  }

  private async saveWrappedVaultKey(
    credentialId: string,
    data: { wrappedKey: string; iv: string }
  ): Promise<void> {
    const dir = await navigator.storage.getDirectory();
    const vaultDir = await dir.getDirectoryHandle("nemo-vault", { create: true });
    const file = await vaultDir.getFileHandle(`key-${credentialId}.enc`, { create: true });
    const writer = await file.createWritable();
    await writer.write(JSON.stringify({ ...data, credentialId }));
    await writer.close();
  }
}
