

import type { Vault, VaultMetadata, VaultState } from "../types"

let vaultState: VaultState = {
  isUnlocked: false,
  vault: null,
  metadata: null,
  lastActivity: Date.now()
}

let sessionKey: CryptoKey | null = null
let autoLockTimeout: ReturnType<typeof setTimeout> | null = null

const AUTO_LOCK_ALARM = 'nemo-auto-lock'
const SESSION_STATE_NAME = 'nemo_vault_state'

export const INITIAL_VAULT: Vault = {
  entries: [],
  settings: { autoLockMinutes: 15, theme: 'dark' }
}

async function persistVaultState(): Promise<void> {
  try {
    await chrome.storage.session.set({
      [SESSION_STATE_NAME]: {
        isUnlocked: vaultState.isUnlocked,
        lastActivity: vaultState.lastActivity,
        activeVaultId: vaultState.metadata?.vaultId ?? null
      }
    })
  } catch {
  }
}

async function restoreVaultState(): Promise<void> {
  try {
    const stored = await chrome.storage.session.get(SESSION_STATE_NAME)
    if (stored[SESSION_STATE_NAME]) {
      const { isUnlocked, lastActivity } = stored[SESSION_STATE_NAME]
      vaultState.isUnlocked = isUnlocked
      vaultState.lastActivity = lastActivity ?? Date.now()
    }
  } catch {
  }
}

async function clearSessionState(): Promise<void> {
  try {
    await chrome.storage.session.remove([SESSION_STATE_NAME])
  } catch {
  }
}

function getAutoLockMs(): number {
  return (vaultState.vault?.settings.autoLockMinutes ?? 15) * 60 * 1000
}

export function resetAutoLock(): void {
  if (autoLockTimeout) {
    clearTimeout(autoLockTimeout)
  }
  const ms = getAutoLockMs()
  autoLockTimeout = setTimeout(() => {
    lockSession()
  }, ms)
  try {
    chrome.alarms.clear(AUTO_LOCK_ALARM, () => {
      chrome.alarms.create(AUTO_LOCK_ALARM, { delayInMinutes: ms / 60000 })
    })
  } catch {}
}

export async function activateVault(vaultKey: CryptoKey, vault: Vault, metadata: VaultMetadata): Promise<void> {
  sessionKey = vaultKey
  vaultState = { isUnlocked: true, vault, metadata, lastActivity: Date.now() }
  await persistVaultState()
  resetAutoLock()
}

export async function getVaultState(): Promise<VaultState> {
  await restoreVaultState()
  if (vaultState.isUnlocked && !sessionKey) {
    vaultState = {
      isUnlocked: false,
      vault: null,
      metadata: null,
      lastActivity: Date.now()
    }
    await clearSessionState()
  }
  if (vaultState.isUnlocked) {
    resetAutoLock()
  }
  return vaultState
}

export async function lockSession(): Promise<void> {
  sessionKey = null
  vaultState = {
    isUnlocked: false,
    vault: null,
    metadata: null,
    lastActivity: Date.now()
  }

  if (autoLockTimeout) {
    clearTimeout(autoLockTimeout)
    autoLockTimeout = null
  }

  await clearSessionState()
}

export function getSessionKey(): CryptoKey | null {
  return sessionKey
}

export function setSessionKey(key: CryptoKey | null): void {
  sessionKey = key
}

export function getCurrentVaultState(): VaultState {
  return vaultState
}

export function setCurrentVaultState(state: VaultState): void {
  vaultState = state
}
