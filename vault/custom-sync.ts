

import type { VaultStorage, EncryptedVault, VaultMetadata, SyncResult } from "./types";
import { LocalStorageAdapter } from "./storage";
import { DEFAULT_SYNC_SERVER } from "../config/sync";

const CUSTOM_BACKEND_CONFIG_KEY = "nemo_custom_backend_config";
const CUSTOM_SYNC_STATUS_KEY = "nemo_custom_sync_status";

export { DEFAULT_SYNC_SERVER };

export interface CustomBackendConfig {
  baseUrl: string;
  authToken: string;
  enabled: boolean;
  lastSyncAt?: number;
  syncOnChange: boolean;
  isAnonymous: boolean;
}

function generateAnonymousToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface CustomSyncStatus {
  status: "idle" | "syncing" | "error" | "success";
  lastSyncAt?: number;
  error?: string;
  pendingChanges: boolean;
}

let currentAdapter: CustomBackendAdapter | null = null;

export class CustomBackendAdapter implements VaultStorage {
  private config: CustomBackendConfig;
  private localAdapter: LocalStorageAdapter;

  constructor(config: CustomBackendConfig) {
    this.config = config;
    this.localAdapter = new LocalStorageAdapter();
  }

  updateConfig(config: Partial<CustomBackendConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): CustomBackendConfig {
    return { ...this.config };
  }

  private getHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.config.authToken}`,
      "Content-Type": "application/json",
    };
  }

  async register(): Promise<{ success: boolean; authToken?: string; error?: string }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const data = await response.json();
      this.config.authToken = data.authToken;
      return { success: true, authToken: data.authToken };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async load(): Promise<EncryptedVault | null> {
    const response = await fetch(`${this.config.baseUrl}/api/vault`, {
      headers: this.getHeaders(),
    });

    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Failed to load vault: ${response.statusText}`);

    const data = await response.json();
    return data.vault as EncryptedVault;
  }

  async save(vault: EncryptedVault): Promise<void> {
    const metadata = await this.localAdapter.loadMetadata();
    if (!metadata) throw new Error("No local metadata available");

    const response = await fetch(`${this.config.baseUrl}/api/vault`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify({
        vault,
        metadata: {
          version: metadata.version,
          createdAt: metadata.createdAt,
          updatedAt: Date.now(),
          deviceId: metadata.deviceId,
          salt: metadata.salt,
          kdf: metadata.kdf,
        },
      }),
    });

    if (!response.ok) throw new Error(`Failed to save vault: ${response.statusText}`);
    this.config.lastSyncAt = Date.now();
  }

  async loadMetadata(): Promise<VaultMetadata | null> {
    const response = await fetch(`${this.config.baseUrl}/api/vault`, {
      headers: this.getHeaders(),
    });

    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Failed to load metadata: ${response.statusText}`);

    const data = await response.json();
    return data.metadata as VaultMetadata;
  }

  async saveMetadata(metadata: VaultMetadata): Promise<void> {
    
    this.config.lastSyncAt = Date.now();
  }

  async exists(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/vault`, {
        method: "HEAD",
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async sync(): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      const localVault = await this.localAdapter.load();
      const remoteVault = await this.load();
      const localMetadata = await this.localAdapter.loadMetadata();
      const remoteMetadata = await this.loadMetadata();

      if (!localMetadata) {
        if (remoteVault && remoteMetadata) {
          await this.localAdapter.save(remoteVault);
          await this.localAdapter.saveMetadata(remoteMetadata);
          return { success: true, direction: "download", timestamp: Date.now() };
        }
        return { success: true, timestamp: Date.now() };
      }

      if (!remoteMetadata) {
        await this.save(localVault!);
        return { success: true, direction: "upload", timestamp: Date.now() };
      }

      const localUpdatedAt = localMetadata.updatedAt;
      const remoteUpdatedAt = remoteMetadata.updatedAt;

      if (localUpdatedAt > remoteUpdatedAt) {
        await this.save(localVault!);
        return { success: true, direction: "upload", timestamp: Date.now() };
      } else if (remoteUpdatedAt > localUpdatedAt) {
        await this.localAdapter.save(remoteVault!);
        await this.localAdapter.saveMetadata(remoteMetadata);
        return { success: true, direction: "download", timestamp: Date.now() };
      }

      return { success: true, timestamp: Date.now() };
    } catch (error: any) {
      return { success: false, error: error.message, timestamp: startTime };
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: "GET",
      });

      if (!response.ok) {
        return { success: false, error: `Server returned ${response.status}` };
      }

      const data = await response.json();
      if (data.status !== "ok") {
        return { success: false, error: "Server not healthy" };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export async function getCustomBackendConfig(): Promise<CustomBackendConfig | null> {
  try {
    const result = await chrome.storage.local.get(CUSTOM_BACKEND_CONFIG_KEY);
    return result[CUSTOM_BACKEND_CONFIG_KEY] ?? null;
  } catch {
    return null;
  }
}

export async function saveCustomBackendConfig(config: CustomBackendConfig): Promise<void> {
  await chrome.storage.local.set({ [CUSTOM_BACKEND_CONFIG_KEY]: config });
}

export async function clearCustomBackendConfig(): Promise<void> {
  await chrome.storage.local.remove(CUSTOM_BACKEND_CONFIG_KEY);
  currentAdapter = null;
}

export async function getCustomSyncStatus(): Promise<CustomSyncStatus> {
  try {
    const result = await chrome.storage.local.get(CUSTOM_SYNC_STATUS_KEY);
    return (
      result[CUSTOM_SYNC_STATUS_KEY] ?? {
        status: "idle",
        pendingChanges: false,
      }
    );
  } catch {
    return { status: "idle", pendingChanges: false };
  }
}

export async function updateCustomSyncStatus(status: Partial<CustomSyncStatus>): Promise<void> {
  const current = await getCustomSyncStatus();
  await chrome.storage.local.set({
    [CUSTOM_SYNC_STATUS_KEY]: { ...current, ...status },
  });
}

export async function initializeCustomSync(
  config: Omit<CustomBackendConfig, "authToken" | "isAnonymous"> & {
    authToken?: string;
    isAnonymous?: boolean;
  }
): Promise<{ success: boolean; error?: string; authToken?: string }> {
  try {
    const baseUrl = config.baseUrl || DEFAULT_SYNC_SERVER;
    const authToken = config.authToken || generateAnonymousToken();
    const isAnonymous = config.isAnonymous ?? !config.authToken;

    const fullConfig: CustomBackendConfig = {
      baseUrl,
      authToken,
      enabled: false, 
      syncOnChange: config.syncOnChange,
      isAnonymous
    };

    const adapter = new CustomBackendAdapter(fullConfig);

    
    const registerResult = await adapter.register();
    if (!registerResult.success) {
      return registerResult;
    }

    
    const testResult = await adapter.testConnection();
    if (!testResult.success) {
      return testResult;
    }

    await saveCustomBackendConfig({ ...fullConfig, enabled: true });
    currentAdapter = adapter;

    await updateCustomSyncStatus({
      status: "idle",
      lastSyncAt: Date.now(),
      pendingChanges: false,
    });

    return { success: true, authToken };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function syncWithCustomBackend(): Promise<SyncResult> {
  const config = await getCustomBackendConfig();
  if (!config || !config.enabled) {
    return {
      success: false,
      error: "Custom backend sync not configured",
      timestamp: Date.now(),
    };
  }

  await updateCustomSyncStatus({ status: "syncing" });

  try {
    const adapter = currentAdapter ?? new CustomBackendAdapter(config);
    currentAdapter = adapter;

    const result = await adapter.sync();

    if (result.success) {
      await updateCustomSyncStatus({
        status: "success",
        lastSyncAt: result.timestamp,
        pendingChanges: false,
      });
    } else {
      await updateCustomSyncStatus({
        status: "error",
        error: result.error,
        pendingChanges: true,
      });
    }

    return result;
  } catch (error: any) {
    const result: SyncResult = {
      success: false,
      error: error.message,
      timestamp: Date.now(),
    };

    await updateCustomSyncStatus({
      status: "error",
      error: error.message,
      pendingChanges: true,
    });

    return result;
  }
}

export async function disableCustomSync(): Promise<void> {
  await clearCustomBackendConfig();
  await updateCustomSyncStatus({
    status: "idle",
    pendingChanges: false,
  });
  currentAdapter = null;
}

export async function isCustomSyncEnabled(): Promise<boolean> {
  const config = await getCustomBackendConfig();
  return config?.enabled ?? false;
}
