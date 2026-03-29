

import type { MessageResponse } from "../types"
import { getSessionKey, getCurrentVaultState } from "./session"

export async function triggerAutoSync(): Promise<void> {
  try {
    const sessionKey = getSessionKey()
    const vaultState = getCurrentVaultState()
    if (!sessionKey || !vaultState.vault || !vaultState.metadata) return
    const { getCustomBackendConfig, CustomBackendAdapter } = await import("../../vault/custom-sync")
    const config = await getCustomBackendConfig()
    if (!config?.enabled || !config.syncOnChange) return

    const adapter = new CustomBackendAdapter(config)
    const { encrypt } = await import("../crypto")
    const { ciphertext, iv } = await encrypt(JSON.stringify(vaultState.vault), sessionKey)

    await adapter.save({
      kdf: "pbkdf2",
      salt: vaultState.metadata.salt,
      iv,
      ciphertext,
      version: 1,
    })
  } catch {}
}

export async function handleTestCustomBackendConnection(config: { baseUrl: string }): Promise<MessageResponse> {
  try {
    const { CustomBackendAdapter } = await import("../../vault/custom-sync")
    const adapter = new CustomBackendAdapter({
      baseUrl: config.baseUrl,
      authToken: "",
      enabled: false,
      syncOnChange: false,
      isAnonymous: true
    })
    const result = await adapter.testConnection()

    if (result.success) {
      return { success: true }
    }
    return { success: false, error: result.error }
  } catch (error: any) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection test failed"
    }
  }
}

export async function handleCustomBackendSync(config?: { baseUrl: string; syncOnChange: boolean }): Promise<MessageResponse> {
  try {
    const { initializeCustomSync, getCustomBackendConfig, CustomBackendAdapter, DEFAULT_SYNC_SERVER } = await import("../../vault/custom-sync")

    if (config) {
      const baseUrl = config.baseUrl || DEFAULT_SYNC_SERVER
      const initResult = await initializeCustomSync({
        baseUrl,
        authToken: "",
        enabled: true,
        syncOnChange: config.syncOnChange
      })

      if (!initResult.success) {
        return { success: false, error: initResult.error }
      }

      return { success: true, data: { authToken: initResult.authToken } }
    }

    const sessionKey = getSessionKey()
    const vaultState = getCurrentVaultState()
    if (!sessionKey || !vaultState.vault || !vaultState.metadata) {
      return { success: false, error: "Vault must be unlocked to sync" }
    }

    const syncConfig = await getCustomBackendConfig()
    if (!syncConfig?.enabled) {
      return { success: false, error: "Sync not enabled" }
    }

    const adapter = new CustomBackendAdapter(syncConfig)
    const { encrypt } = await import("../crypto")
    const { ciphertext, iv } = await encrypt(JSON.stringify(vaultState.vault), sessionKey)

    await adapter.save({
      kdf: "pbkdf2",
      salt: vaultState.metadata.salt,
      iv,
      ciphertext,
      version: 1,
    })

    return { success: true, data: { direction: "upload", timestamp: Date.now() } }
  } catch (error: any) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Sync failed"
    }
  }
}

export async function handleDisableCustomBackendSync(): Promise<MessageResponse> {
  try {
    const { disableCustomSync } = await import("../../vault/custom-sync")
    await disableCustomSync()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to disable sync"
    }
  }
}

export async function handleCustomBackendSyncStatus(): Promise<MessageResponse> {
  try {
    const { getCustomSyncStatus, getCustomBackendConfig } = await import("../../vault/custom-sync")
    const [status, config] = await Promise.all([getCustomSyncStatus(), getCustomBackendConfig()])

    return {
      success: true,
      data: {
        ...status,
        enabled: config?.enabled ?? false,
        baseUrl: config?.baseUrl,
        authToken: config?.authToken
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get sync status"
    }
  }
}

export async function handleTestCloudflareConnection(config: { accountId: string; databaseId: string; apiToken: string }): Promise<MessageResponse> {
  try {
    const { testCloudflareConnection } = await import("../../vault/sync")
    const result = await testCloudflareConnection({
      ...config,
      enabled: false,
      syncOnChange: false
    })

    if (result.success) {
      return { success: true }
    }
    return { success: false, error: result.error }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection test failed"
    }
  }
}

export async function handleCloudflareSync(config?: { accountId: string; databaseId: string; apiToken: string; syncOnChange: boolean }): Promise<MessageResponse> {
  try {
    const { initializeCloudflareSync, syncWithCloudflare, getCloudflareConfig } = await import("../../vault/sync")

    if (config) {
      const initResult = await initializeCloudflareSync({
        ...config,
        enabled: true,
        lastSyncAt: Date.now()
      })

      if (!initResult.success) {
        return { success: false, error: initResult.error }
      }
    }

    const existingConfig = await getCloudflareConfig()
    if (!existingConfig) {
      return { success: false, error: "Cloudflare sync not configured" }
    }

    const result = await syncWithCloudflare()

    if (result.success) {
      return { success: true, data: result }
    }
    return { success: false, error: result.error }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Sync failed"
    }
  }
}

export async function handleDisableCloudflareSync(): Promise<MessageResponse> {
  try {
    const { disableCloudflareSync } = await import("../../vault/sync")
    await disableCloudflareSync()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to disable sync"
    }
  }
}

export async function handleSyncStatus(): Promise<MessageResponse> {
  try {
    const { getSyncStatus, getCloudflareConfig } = await import("../../vault/sync")
    const [status, config] = await Promise.all([getSyncStatus(), getCloudflareConfig()])

    return {
      success: true,
      data: {
        ...status,
        enabled: config?.enabled ?? false
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get sync status"
    }
  }
}
