import type { SyncResult, SyncStatus } from "../../vault/types"
import { getCustomBackendConfig, getCustomSyncStatus, updateCustomSyncStatus, CustomBackendAdapter } from "../../vault/custom-sync"
import { getCloudflareConfig, getSyncStatus, updateSyncStatus } from "../../vault/sync"
import { CloudflareD1Adapter } from "../../vault/storage"

const SYNC_RETRY_KEY = "nemo_sync_retry"
const SYNC_QUEUE_KEY = "nemo_sync_queue"
const SYNC_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAYS = [5000, 15000, 60000] // 5s, 15s, 1min
const BACKUP_REMINDER_KEY = "nemo_backup_reminder"
const BACKUP_REMINDER_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

async function getActiveSync() {
  const custom = await getCustomBackendConfig()
  const cloudflare = await getCloudflareConfig()
  return { custom, cloudflare, hasEnabled: !!(custom?.enabled || cloudflare?.enabled) }
}

async function applySyncStatus(
  custom: Awaited<ReturnType<typeof getCustomBackendConfig>>,
  cloudflare: Awaited<ReturnType<typeof getCloudflareConfig>>,
  status: Partial<SyncStatus>
): Promise<void> {
  if (custom?.enabled) {
    await updateCustomSyncStatus(status)
  } else if (cloudflare?.enabled) {
    await updateSyncStatus(status)
  }
}

function resultToStatus(result: SyncResult, extras?: { pendingChanges?: boolean }): Partial<SyncStatus> {
  return {
    status: result.success ? "success" : "error",
    lastSyncAt: result.success ? result.timestamp : undefined,
    error: result.success ? undefined : result.error,
    ...extras
  }
}

interface RetryState {
  attempt: number
  lastError?: string
  nextRetryAt?: number
}

interface QueuedSync {
  timestamp: number
  data: {
    kdf: string
    salt: string
    iv: string
    ciphertext: string
    version: number
  }
}

let syncTimer: ReturnType<typeof setInterval> | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null

export async function getRetryState(): Promise<RetryState> {
  try {
    const result = await chrome.storage.local.get(SYNC_RETRY_KEY)
    return result[SYNC_RETRY_KEY] ?? { attempt: 0 }
  } catch {
    return { attempt: 0 }
  }
}

export async function setRetryState(state: RetryState): Promise<void> {
  await chrome.storage.local.set({ [SYNC_RETRY_KEY]: state })
}

export async function clearRetryState(): Promise<void> {
  await chrome.storage.local.remove(SYNC_RETRY_KEY)
}

export async function getQueuedSync(): Promise<QueuedSync | null> {
  try {
    const result = await chrome.storage.local.get(SYNC_QUEUE_KEY)
    return result[SYNC_QUEUE_KEY] ?? null
  } catch {
    return null
  }
}

export async function queueSync(data: QueuedSync["data"]): Promise<void> {
  await chrome.storage.local.set({
    [SYNC_QUEUE_KEY]: { timestamp: Date.now(), data }
  })
}

export async function clearQueuedSync(): Promise<void> {
  await chrome.storage.local.remove(SYNC_QUEUE_KEY)
}

export async function syncWithRetry(): Promise<SyncResult> {
  const { getSessionKey, getCurrentVaultState } = await import("./session")

  const sessionKey = getSessionKey()
  const vaultState = getCurrentVaultState()

  if (!sessionKey || !vaultState.vault || !vaultState.metadata) {
    return { success: false, error: "Vault not unlocked", timestamp: Date.now() }
  }

  const { custom, cloudflare } = await getActiveSync()

  let result: SyncResult

  if (custom?.enabled) {
    const adapter = new CustomBackendAdapter(custom)
    result = await adapter.sync()
  } else if (cloudflare?.enabled) {
    const adapter = new CloudflareD1Adapter(cloudflare)
    result = await adapter.sync()
  } else {
    return { success: false, error: "No sync configured", timestamp: Date.now() }
  }

  if (!result.success) {
    const retryState = await getRetryState()
    const nextAttempt = retryState.attempt + 1

    if (nextAttempt <= MAX_RETRY_ATTEMPTS) {
      const delay = RETRY_DELAYS[nextAttempt - 1] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1]

      await setRetryState({
        attempt: nextAttempt,
        lastError: result.error,
        nextRetryAt: Date.now() + delay
      })

      scheduleRetry(delay)
    }
  } else {
    await clearRetryState()
    await clearQueuedSync()
  }

  return result
}

function scheduleRetry(delay: number): void {
  if (retryTimer) {
    clearTimeout(retryTimer)
  }

  retryTimer = setTimeout(async () => {
    const { custom, cloudflare } = await getActiveSync()
    await applySyncStatus(custom, cloudflare, { status: "syncing" })

    const result = await syncWithRetry()
    await applySyncStatus(custom, cloudflare, resultToStatus(result))
  }, delay)
}

export async function triggerAutoSync(): Promise<void> {
  const { getSessionKey, getCurrentVaultState } = await import("./session")
  const { encrypt } = await import("../crypto")

  const sessionKey = getSessionKey()
  const vaultState = getCurrentVaultState()

  if (!sessionKey || !vaultState.vault || !vaultState.metadata) {
    return
  }

  const { custom, cloudflare } = await getActiveSync()

  const isSyncEnabled = (custom?.enabled && custom.syncOnChange) ||
                        (cloudflare?.enabled && cloudflare.syncOnChange)

  if (!isSyncEnabled) {
    return
  }

  try {
    const { ciphertext, iv } = await encrypt(JSON.stringify(vaultState.vault), sessionKey)

    await queueSync({
      kdf: "pbkdf2",
      salt: vaultState.metadata.salt,
      iv,
      ciphertext,
      version: 1
    })

    await applySyncStatus(custom, cloudflare, { status: "syncing", pendingChanges: true })
    const result = await syncWithRetry()
    await applySyncStatus(custom, cloudflare, resultToStatus(result, { pendingChanges: !result.success }))
  } catch (error) {
    console.error("Auto-sync failed:", error)
  }
}

export function startPeriodicSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer)
  }

  syncTimer = setInterval(async () => {
    const { getSessionKey, getCurrentVaultState } = await import("./session")

    const sessionKey = getSessionKey()
    const vaultState = getCurrentVaultState()

    if (!sessionKey || !vaultState.vault || !vaultState.metadata) {
      return
    }

    const { custom, cloudflare, hasEnabled } = await getActiveSync()
    if (!hasEnabled) return

    if (custom?.enabled) {
      const status = await getCustomSyncStatus()
      if (status.status === "syncing") return
    } else if (cloudflare?.enabled) {
      const status = await getSyncStatus()
      if (status.status === "syncing") return
    }

    await triggerAutoSync()
  }, SYNC_INTERVAL_MS)
}

export function stopPeriodicSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
}

export async function syncOnUnlock(): Promise<SyncResult | null> {
  const { custom, cloudflare, hasEnabled } = await getActiveSync()
  if (!hasEnabled) return null

  if (custom?.enabled) {
    const status = await getCustomSyncStatus()
    if (status.status === "syncing") return null
  } else if (cloudflare?.enabled) {
    const status = await getSyncStatus()
    if (status.status === "syncing") return null
  }

  const retryState = await getRetryState()
  if (retryState.attempt > 0 && retryState.nextRetryAt && Date.now() < retryState.nextRetryAt) {
    return null
  }

  await applySyncStatus(custom, cloudflare, { status: "syncing" })
  const result = await syncWithRetry()

  if (!result.success && result.error) {
    console.error('[Nemo] Sync on unlock failed:', result.error)
  }

  await applySyncStatus(custom, cloudflare, resultToStatus(result, { pendingChanges: !result.success }))
  return result
}

export async function processQueuedSync(): Promise<boolean> {
  const queued = await getQueuedSync()
  if (!queued) return false

  const retryState = await getRetryState()
  if (retryState.attempt >= MAX_RETRY_ATTEMPTS) {
    await clearQueuedSync()
    await clearRetryState()
    return false
  }

  const result = await syncWithRetry()
  return result.success
}

export async function shouldShowBackupReminder(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(BACKUP_REMINDER_KEY)
    const lastReminder = result[BACKUP_REMINDER_KEY] as number | undefined

    if (!lastReminder) {
      return true
    }

    return Date.now() - lastReminder > BACKUP_REMINDER_INTERVAL_MS
  } catch {
    return false
  }
}

export async function markBackupReminderShown(): Promise<void> {
  await chrome.storage.local.set({ [BACKUP_REMINDER_KEY]: Date.now() })
}

export async function resetBackupReminder(): Promise<void> {
  await chrome.storage.local.remove(BACKUP_REMINDER_KEY)
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onSuspend) {
  chrome.runtime.onSuspend.addListener(() => {
    stopPeriodicSync()
  })
}