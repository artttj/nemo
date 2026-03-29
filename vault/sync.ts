

import type { CloudflareD1Config, SyncStatus, SyncResult } from "./types";
import { CloudflareD1Adapter } from "./storage";

const SYNC_CONFIG_KEY = "nemo_cloudflare_d1_config";
const SYNC_STATUS_KEY = "nemo_sync_status";

let currentAdapter: CloudflareD1Adapter | null = null;

function isBackgroundContext(): boolean {
  return typeof chrome !== "undefined" &&
         !!chrome.runtime &&
         !!chrome.runtime.onMessage;
}

function isExtensionPopup(): boolean {
  return typeof window !== "undefined" &&
         window.location?.protocol === "chrome-extension:" &&
         window.location?.pathname?.includes("popup");
}

export async function getCloudflareConfig(): Promise<CloudflareD1Config | null> {
  try {
    const result = await chrome.storage.local.get(SYNC_CONFIG_KEY);
    return result[SYNC_CONFIG_KEY] ?? null;
  } catch {
    return null;
  }
}

export async function saveCloudflareConfig(config: CloudflareD1Config): Promise<void> {
  await chrome.storage.local.set({ [SYNC_CONFIG_KEY]: config });
}

export async function clearCloudflareConfig(): Promise<void> {
  await chrome.storage.local.remove(SYNC_CONFIG_KEY);
  currentAdapter = null;
}

export async function getSyncStatus(): Promise<SyncStatus> {
  try {
    const result = await chrome.storage.local.get(SYNC_STATUS_KEY);
    return result[SYNC_STATUS_KEY] ?? {
      status: 'idle',
      pendingChanges: false
    };
  } catch {
    return {
      status: 'idle',
      pendingChanges: false
    };
  }
}

export async function updateSyncStatus(status: Partial<SyncStatus>): Promise<void> {
  const current = await getSyncStatus();
  await chrome.storage.local.set({
    [SYNC_STATUS_KEY]: { ...current, ...status }
  });
}

export async function testCloudflareConnection(config: CloudflareD1Config): Promise<{ success: boolean; error?: string }> {
  if (!isBackgroundContext()) {
    return {
      success: false,
      error: "Sync operations must run from the background script"
    };
  }
  const adapter = new CloudflareD1Adapter(config);
  return await adapter.testConnection();
}

export async function initializeCloudflareSync(config: CloudflareD1Config): Promise<{ success: boolean; error?: string }> {
  try {
    const adapter = new CloudflareD1Adapter(config);
    await adapter.initializeSchema();

    const connectionTest = await adapter.testConnection();
    if (!connectionTest.success) {
      return connectionTest;
    }

    await saveCloudflareConfig(config);
    currentAdapter = adapter;

    await updateSyncStatus({
      status: 'idle',
      lastSyncAt: config.lastSyncAt,
      pendingChanges: false
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function syncWithCloudflare(): Promise<SyncResult> {
  const config = await getCloudflareConfig();
  if (!config || !config.enabled) {
    return {
      success: false,
      error: 'Cloudflare sync not configured or disabled',
      timestamp: Date.now()
    };
  }

  await updateSyncStatus({ status: 'syncing' });

  try {
    const adapter = currentAdapter ?? new CloudflareD1Adapter(config);
    currentAdapter = adapter;

    const result = await adapter.sync();

    if (result.success) {
      await updateSyncStatus({
        status: 'success',
        lastSyncAt: result.timestamp,
        pendingChanges: false
      });
    } else {
      await updateSyncStatus({
        status: 'error',
        error: result.error,
        pendingChanges: true
      });
    }

    return result;
  } catch (error: any) {
    const result: SyncResult = {
      success: false,
      error: error.message,
      timestamp: Date.now()
    };

    await updateSyncStatus({
      status: 'error',
      error: error.message,
      pendingChanges: true
    });

    return result;
  }
}

export async function disableCloudflareSync(): Promise<void> {
  await clearCloudflareConfig();
  await updateSyncStatus({
    status: 'idle',
    pendingChanges: false
  });
  currentAdapter = null;
}

export async function isCloudflareSyncEnabled(): Promise<boolean> {
  const config = await getCloudflareConfig();
  return config?.enabled ?? false;
}

export function getCurrentAdapter(): CloudflareD1Adapter | null {
  return currentAdapter;
}

export async function updateSyncConfig(updates: Partial<CloudflareD1Config>): Promise<void> {
  const config = await getCloudflareConfig();
  if (config) {
    const updated = { ...config, ...updates };
    await saveCloudflareConfig(updated);

    if (currentAdapter) {
      currentAdapter.updateConfig(updated);
    }
  }
}
