/**
 * Copyright 2024-2025 Artem Iagovdik <artyom.yagovdik@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import type { VaultStorage, EncryptedVault, VaultMetadata } from "./types";

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

  setStorage(storage: VaultStorage): void {
    this.storage = storage;
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
