

import type { VaultStorage, EncryptedVault, VaultMetadata, CloudflareD1Config, SyncResult, Syncable } from "./types";

const VAULT_DIR = "nemo-vault";
const VAULT_FILE = "vault.enc";
const METADATA_FILE = "metadata.json";

let opfsRoot: FileSystemDirectoryHandle | null = null;

async function getOPFSRoot(): Promise<FileSystemDirectoryHandle> {
  if (!opfsRoot) {
    opfsRoot = await navigator.storage.getDirectory();
  }
  return opfsRoot;
}

async function getVaultDirectory(create = true): Promise<FileSystemDirectoryHandle | null> {
  try {
    const root = await getOPFSRoot();
    if (create) {
      return await root.getDirectoryHandle(VAULT_DIR, { create: true });
    }
    return await root.getDirectoryHandle(VAULT_DIR);
  } catch {
    return null;
  }
}

export class LocalStorageAdapter implements VaultStorage {
  async load(): Promise<EncryptedVault | null> {
    const dir = await getVaultDirectory(false);
    if (!dir) return null;

    try {
      const file = await dir.getFileHandle(VAULT_FILE);
      const blob = await file.getFile();
      const text = await blob.text();
      return JSON.parse(text) as EncryptedVault;
    } catch {
      return null;
    }
  }

  async save(vault: EncryptedVault): Promise<void> {
    const dir = await getVaultDirectory(true);
    if (!dir) throw new Error("Failed to access vault directory");

    const vaultFile = await dir.getFileHandle(VAULT_FILE, { create: true });
    const writer = await vaultFile.createWritable();
    await writer.write(JSON.stringify(vault));
    await writer.close();
  }

  async loadMetadata(): Promise<VaultMetadata | null> {
    const dir = await getVaultDirectory(false);
    if (!dir) return null;

    try {
      const file = await dir.getFileHandle(METADATA_FILE);
      const blob = await file.getFile();
      const text = await blob.text();
      return JSON.parse(text) as VaultMetadata;
    } catch {
      return null;
    }
  }

  async saveMetadata(metadata: VaultMetadata): Promise<void> {
    const dir = await getVaultDirectory(true);
    if (!dir) throw new Error("Failed to access vault directory");

    const metadataFile = await dir.getFileHandle(METADATA_FILE, { create: true });
    const writer = await metadataFile.createWritable();
    await writer.write(JSON.stringify(metadata, null, 2));
    await writer.close();
  }

  async exists(): Promise<boolean> {
    const dir = await getVaultDirectory(false);
    if (!dir) return false;
    try {
      await dir.getFileHandle(VAULT_FILE);
      return true;
    } catch {
      return false;
    }
  }
}

export class RemoteStorageAdapter implements VaultStorage {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  clearAuthToken(): void {
    this.authToken = null;
  }

  async load(): Promise<EncryptedVault | null> {
    if (!this.baseUrl) throw new Error("Remote storage not configured");

    const response = await fetch(`${this.baseUrl}/vault`, {
      headers: this.getHeaders()
    });

    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Failed to load vault: ${response.statusText}`);

    return await response.json() as EncryptedVault;
  }

  async save(vault: EncryptedVault): Promise<void> {
    if (!this.baseUrl) throw new Error("Remote storage not configured");

    const response = await fetch(`${this.baseUrl}/vault`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(vault)
    });

    if (!response.ok) throw new Error(`Failed to save vault: ${response.statusText}`);
  }

  async loadMetadata(): Promise<VaultMetadata | null> {
    if (!this.baseUrl) throw new Error("Remote storage not configured");

    const response = await fetch(`${this.baseUrl}/vault/metadata`, {
      headers: this.getHeaders()
    });

    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Failed to load metadata: ${response.statusText}`);

    return await response.json() as VaultMetadata;
  }

  async saveMetadata(metadata: VaultMetadata): Promise<void> {
    if (!this.baseUrl) throw new Error("Remote storage not configured");

    const response = await fetch(`${this.baseUrl}/vault/metadata`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(metadata)
    });

    if (!response.ok) throw new Error(`Failed to save metadata: ${response.statusText}`);
  }

  async exists(): Promise<boolean> {
    try {
      return await this.loadMetadata() !== null;
    } catch {
      return false;
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json"
    };
    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }
    return headers;
  }
}

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

export class CloudflareD1Adapter implements VaultStorage, Syncable {
  private config: CloudflareD1Config;
  private localStorage: VaultStorage;

  constructor(config: CloudflareD1Config, localStorage?: VaultStorage) {
    this.config = config;
    this.localStorage = localStorage ?? new LocalStorageAdapter();
  }

  updateConfig(config: Partial<CloudflareD1Config>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): CloudflareD1Config {
    return { ...this.config };
  }

  private getHeaders(): HeadersInit {
    return {
      "Authorization": `Bearer ${this.config.apiToken}`,
      "Content-Type": "application/json"
    };
  }

  private async queryD1(sql: string, params: unknown[] = []): Promise<unknown> {
    const response = await fetch(
      `${CLOUDFLARE_API_BASE}/accounts/${this.config.accountId}/d1/database/${this.config.databaseId}/query`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ sql, params })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`D1 query failed: ${response.status} - ${error}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(`D1 query error: ${JSON.stringify(result.errors)}`);
    }

    return result.result?.[0]?.results ?? [];
  }

  async initializeSchema(): Promise<void> {
    const createVaultsTable = `
      CREATE TABLE IF NOT EXISTS vaults (
        vault_id TEXT PRIMARY KEY,
        ciphertext TEXT NOT NULL,
        salt TEXT NOT NULL,
        iv TEXT NOT NULL,
        kdf TEXT NOT NULL,
        version INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `;

    const createMetadataTable = `
      CREATE TABLE IF NOT EXISTS vault_metadata (
        vault_id TEXT PRIMARY KEY,
        version INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        device_id TEXT NOT NULL,
        salt TEXT NOT NULL,
        kdf TEXT NOT NULL
      )
    `;

    await this.queryD1(createVaultsTable);
    await this.queryD1(createMetadataTable);
  }

  async load(): Promise<EncryptedVault | null> {
    const results = await this.queryD1(
      "SELECT * FROM vaults WHERE vault_id = ?",
      [await this.getVaultId()]
    ) as Array<{
      ciphertext: string
      salt: string
      iv: string
      kdf: string
      version: number
    }>;

    if (results.length === 0) {
      return null;
    }

    const row = results[0];
    return {
      kdf: row.kdf as "argon2id" | "pbkdf2",
      salt: row.salt,
      iv: row.iv,
      ciphertext: row.ciphertext,
      version: row.version as 1
    };
  }

  async save(vault: EncryptedVault): Promise<void> {
    await this.queryD1(
      `
        INSERT INTO vaults (vault_id, ciphertext, salt, iv, kdf, version, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(vault_id) DO UPDATE SET
          ciphertext = excluded.ciphertext,
          salt = excluded.salt,
          iv = excluded.iv,
          kdf = excluded.kdf,
          version = excluded.version,
          updated_at = excluded.updated_at
      `,
      [
        await this.getVaultId(),
        vault.ciphertext,
        vault.salt,
        vault.iv,
        vault.kdf,
        vault.version,
        Date.now()
      ]
    );

    this.config.lastSyncAt = Date.now();
  }

  async loadMetadata(): Promise<VaultMetadata | null> {
    const results = await this.queryD1(
      "SELECT * FROM vault_metadata WHERE vault_id = ?",
      [await this.getVaultId()]
    ) as Array<{
      version: number
      created_at: number
      updated_at: number
      device_id: string
      salt: string
      kdf: string
    }>;

    if (results.length === 0) {
      return null;
    }

    const row = results[0];
    return {
      version: row.version as 1,
      vaultId: await this.getVaultId(),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deviceId: row.device_id,
      salt: row.salt,
      kdf: row.kdf as "argon2id" | "pbkdf2"
    };
  }

  async saveMetadata(metadata: VaultMetadata): Promise<void> {
    await this.queryD1(
      `
        INSERT INTO vault_metadata (vault_id, version, created_at, updated_at, device_id, salt, kdf)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(vault_id) DO UPDATE SET
          version = excluded.version,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          device_id = excluded.device_id,
          salt = excluded.salt,
          kdf = excluded.kdf
      `,
      [
        metadata.vaultId,
        metadata.version,
        metadata.createdAt,
        metadata.updatedAt,
        metadata.deviceId,
        metadata.salt,
        metadata.kdf
      ]
    );

    this.config.lastSyncAt = Date.now();
  }

  async exists(): Promise<boolean> {
    try {
      const metadata = await this.loadMetadata();
      return metadata !== null;
    } catch {
      return false;
    }
  }

  async sync(): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      const localVault = await this.localStorage.load();
      const remoteVault = await this.load();
      const localMetadata = await this.localStorage.loadMetadata();
      const remoteMetadata = await this.loadMetadata();

      if (!localMetadata) {
        if (remoteMetadata) {
          await this.localStorage.save(remoteVault!);
          await this.localStorage.saveMetadata(remoteMetadata);
          return {
            success: true,
            direction: 'download',
            timestamp: Date.now()
          };
        }
        return { success: true, timestamp: Date.now() };
      }

      if (!remoteMetadata) {
        await this.save(localVault!);
        await this.saveMetadata(localMetadata);
        return {
          success: true,
          direction: 'upload',
          timestamp: Date.now()
        };
      }

      const localUpdatedAt = localMetadata.updatedAt;
      const remoteUpdatedAt = remoteMetadata.updatedAt;

      if (localUpdatedAt > remoteUpdatedAt) {
        await this.save(localVault!);
        await this.saveMetadata(localMetadata);
        return {
          success: true,
          direction: 'upload',
          timestamp: Date.now()
        };
      } else if (remoteUpdatedAt > localUpdatedAt) {
        await this.localStorage.save(remoteVault!);
        await this.localStorage.saveMetadata(remoteMetadata);
        return {
          success: true,
          direction: 'download',
          timestamp: Date.now()
        };
      }

      return {
        success: true,
        timestamp: Date.now()
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: startTime
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.initializeSchema();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async getVaultId(): Promise<string> {
    const metadata = await this.localStorage.loadMetadata();
    return metadata?.vaultId ?? "default";
  }
}

export function isSyncable(storage: VaultStorage): storage is VaultStorage & Syncable {
  return 'sync' in storage && 'testConnection' in storage;
}

export class VaultStorageManager {
  private storage: VaultStorage;

  constructor(storage?: VaultStorage) {
    this.storage = storage ?? new LocalStorageAdapter();
  }

  static createLocal(): VaultStorageManager {
    return new VaultStorageManager(new LocalStorageAdapter());
  }

  static createRemote(baseUrl: string, authToken?: string): VaultStorageManager {
    const adapter = new RemoteStorageAdapter(baseUrl);
    if (authToken) adapter.setAuthToken(authToken);
    return new VaultStorageManager(adapter);
  }

  static createCloudflareD1(config: CloudflareD1Config): VaultStorageManager {
    return new VaultStorageManager(new CloudflareD1Adapter(config));
  }

  setStorage(storage: VaultStorage): void {
    this.storage = storage;
  }

  getSyncAdapter(): Syncable | undefined {
    return isSyncable(this.storage) ? this.storage : undefined;
  }

  async load(): Promise<EncryptedVault | null> {
    return await this.storage.load();
  }

  async save(vault: EncryptedVault): Promise<void> {
    await this.storage.save(vault);
  }

  async loadMetadata(): Promise<VaultMetadata | null> {
    return await this.storage.loadMetadata();
  }

  async saveMetadata(metadata: VaultMetadata): Promise<void> {
    await this.storage.saveMetadata(metadata);
  }

  async exists(): Promise<boolean> {
    return await this.storage.exists();
  }
}
