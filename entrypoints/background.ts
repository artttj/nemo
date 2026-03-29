

import { defineBackground } from 'wxt/sandbox'
import type { Message, MessageResponse } from '../utils/types'
import {
  getVaultState,
  createVault,
  createVaultFromRecovery,
  createVaultWithOptions,
  unlockVault,
  unlockVaultFromRecovery,
  unlockVaultWithPin,
  lockVault,
  handleAddEntry,
  handleUpdateEntry,
  handleDeleteEntry,
  handleRestoreEntryVersion,
  handleSearchEntries,
  handleGetEntryByUrl,
  handleExportVault,
  handleImportVault,
  handleUpdateSettings,
  handleClipboardCopy,
  checkVaultExists,
  hasPinConfigured,
  getPinConfiguredLength,
  setupVaultPin,
  removeVaultPin,
  getVaultList,
  switchVault,
  createNewVaultInRegistry,
  renameVault,
  deleteVault,
  handleGetSitePreferences,
  handleSetSitePreferences,
  handleDeleteSitePreferences,
  handleCloudflareSync,
  handleSyncStatus,
  handleTestCloudflareConnection,
  handleDisableCloudflareSync,
  handleTestCustomBackendConnection,
  handleCustomBackendSync,
  handleDisableCustomBackendSync,
  handleCustomBackendSyncStatus,
  verifyRecoveryPhrase,
  getRecoveryStatus,
  updateRecoveryVerified,
  dismissRecoveryReminder,
  shouldShowBackupReminder,
  markBackupReminderShown,
  resetBackupReminder
} from '../utils/vault-ops'
import { authenticateWithCredential, getStoredCredentialId } from '../utils/auth'
import { loadVaultMetadata, loadVaultKey } from '../utils/vault'
import { handleWebAuthnResult } from '../utils/webauthn-handler'
import { setActiveVault as setVaultActive } from '../utils/vault'
import { generateRecoveryPhrase } from '../vault/recovery'

export default defineBackground({
  main() {
    chrome.runtime.onMessage.addListener(
      (message: Message, sender, sendResponse: (response: MessageResponse) => void) => {
        handleMessage(message, sender)
          .then((response) => {
            sendResponse(response)
          })
          .catch((error) => {
            sendResponse({ success: false, error: error.message })
          })
        return true
      }
    )

    
    chrome.commands?.onCommand?.addListener((command) => {
      if (command === 'lock_vault') {
        lockVault().catch(console.error)
      }
    })

    chrome.alarms?.onAlarm?.addListener((alarm) => {
      if (alarm.name === 'nemo-auto-lock') {
        lockVault().catch(console.error)
      }
    })
  }
})

async function handleMessage(message: Message, sender?: chrome.runtime.MessageSender): Promise<MessageResponse> {
  // Validate message sender - only accept messages from our own extension
  if (sender && sender.id !== chrome.runtime.id) {
    return { success: false, error: 'Invalid sender' }
  }

  switch (message.type) {
    case 'GET_VAULT_STATE':
      return { success: true, data: await getVaultState() }

    case 'CHECK_VAULT_EXISTS':
      return { success: true, data: await checkVaultExists() }

    case 'HAS_PIN_SETUP':
      return { success: true, data: await hasPinConfigured() }

    case 'GET_PIN_LENGTH':
      return { success: true, data: await getPinConfiguredLength() }

    case 'SETUP_VAULT_PIN': {
      const result = await setupVaultPin(message.payload as string)
      if (result.success) return result

      if (result.error === 'Vault must be unlocked to set up PIN') {
        try {
          const credentialId = await getStoredCredentialId()
          if (!credentialId) {
            return { success: false, error: 'No credential found. Please unlock first.' }
          }

          const { exists: vaultExists } = await checkVaultExists()
          if (!vaultExists) {
            return { success: false, error: 'No vault found.' }
          }

          const metadata = await loadVaultMetadata()
          if (!metadata) {
            return { success: false, error: 'Failed to load vault metadata.' }
          }

          const { wrappingKey } = await authenticateWithCredential(credentialId, metadata.salt)
          const vaultKey = await loadVaultKey(wrappingKey)
          if (!vaultKey) {
            return { success: false, error: 'Failed to unwrap vault key.' }
          }

          return await setupVaultPin(message.payload as string, vaultKey)
        } catch (error: any) {
          return { success: false, error: error.message || 'Authentication failed.' }
        }
      }

      return result
    }

    case 'REMOVE_VAULT_PIN':
      return removeVaultPin()

    case 'GET_VAULT_REGISTRY':
      return getVaultList()

    case 'SET_ACTIVE_VAULT':
      const vaultId = message.payload as string
      const setActiveResult = await setVaultActive(vaultId)
      if (setActiveResult) {
        return switchVault(vaultId)
      }
      return { success: false, error: 'Vault not found' }

    case 'GENERATE_RECOVERY_PHRASE':
      return { success: true, data: await generateRecoveryPhrase() }

    case 'CREATE_VAULT_WITH_OPTIONS': {
      const setupPayload = message.payload as { recoveryPhrase: string; enableTouchId: boolean }
      return createVaultWithOptions(setupPayload.recoveryPhrase, setupPayload.enableTouchId)
    }

    case 'CREATE_VAULT':
      return createVault()

    case 'CREATE_NEW_VAULT':
      const createPayload = message.payload as { name: string }
      return createNewVaultInRegistry(createPayload.name)

    case 'CREATE_VAULT_FROM_RECOVERY':
      return createVaultFromRecovery(message.payload as string)

    case 'UNLOCK_VAULT':
      return unlockVault()
    
    case 'UNLOCK_VAULT_FROM_RECOVERY':
      return unlockVaultFromRecovery(message.payload as string)

    case 'UNLOCK_VAULT_WITH_PIN':
      return unlockVaultWithPin(message.payload as string)

    case 'LOCK_VAULT':
      return lockVault()

    case 'DELETE_VAULT':
      return deleteVault(message.payload as string)

    case 'RENAME_VAULT':
      const renamePayload = message.payload as { vaultId: string; name: string }
      return renameVault(renamePayload.vaultId, renamePayload.name)

    case 'ADD_ENTRY':
      return handleAddEntry(message.payload as Parameters<typeof handleAddEntry>[0])

    case 'UPDATE_ENTRY': {
      const updatePayload = message.payload as { id: string; updates: Parameters<typeof handleUpdateEntry>[1] }
      return handleUpdateEntry(updatePayload.id, updatePayload.updates)
    }

    case 'DELETE_ENTRY':
      return handleDeleteEntry(message.payload as string)

    case 'RESTORE_ENTRY_VERSION': {
      const restorePayload = message.payload as { entryId: string; version: number }
      return handleRestoreEntryVersion(restorePayload.entryId, restorePayload.version)
    }

    case 'GET_ENTRIES': {
      const state = await getVaultState()
      return { success: true, data: state.vault?.entries ?? [] }
    }

    case 'GET_ENTRIES_FOR_AUTOFILL': {
      const autofillState = await getVaultState()
      if (!autofillState.isUnlocked || !autofillState.vault) {
        return { success: false, error: 'Vault is locked' }
      }
      const tabUrl = sender?.tab?.url || sender?.url || ''
      if (!tabUrl) {
        return { success: true, data: [] }
      }
      const { getEntriesByUrl } = await import('../utils/vault')
      const filtered = getEntriesByUrl(autofillState.vault, tabUrl)
      return { success: true, data: filtered }
    }

    case 'SEARCH_ENTRIES':
      return handleSearchEntries(message.payload as string)

    case 'GET_ENTRY_BY_URL':
      return handleGetEntryByUrl(message.payload as string)

    case 'EXPORT_VAULT':
      return handleExportVault()

    case 'IMPORT_VAULT':
      return handleImportVault(message.payload as string)

    case 'UPDATE_SETTINGS':
      return handleUpdateSettings(message.payload as Parameters<typeof handleUpdateSettings>[0])

    case 'COPY_TO_CLIPBOARD': {
      const clipboardPayload = message.payload as { text: string; clearAfter?: number }
      return handleClipboardCopy(clipboardPayload.text, clipboardPayload.clearAfter)
    }

    case 'WEBAUTHN_RESULT':
      handleWebAuthnResult(message.payload as { promiseId: string; error?: string; success?: boolean; data?: unknown })
      return { success: true }

    case 'GET_SITE_PREFERENCES':
      return handleGetSitePreferences(message.payload as string | undefined)

    case 'SET_SITE_PREFERENCES': {
      const prefsPayload = message.payload as { hostname: string; preferences: { autoFillMode?: 'always' | 'never' | 'ask'; defaultUsername?: string; preferredEntryId?: string } }
      return handleSetSitePreferences(prefsPayload.hostname, prefsPayload.preferences)
    }

    case 'DELETE_SITE_PREFERENCES':
      return handleDeleteSitePreferences(message.payload as string)

    case 'TEST_CLOUDFLARE_CONNECTION':
      return handleTestCloudflareConnection(message.payload as { accountId: string; databaseId: string; apiToken: string })

    case 'ENABLE_CLOUDFLARE_SYNC':
      return handleCloudflareSync(message.payload as { accountId: string; databaseId: string; apiToken: string; syncOnChange: boolean })

    case 'DISABLE_CLOUDFLARE_SYNC':
      return handleDisableCloudflareSync()

    case 'GET_SYNC_STATUS':
      return handleSyncStatus()

    case 'TRIGGER_SYNC':
      return handleCloudflareSync()

    case 'TEST_CUSTOM_BACKEND_CONNECTION':
      return handleTestCustomBackendConnection(message.payload as { baseUrl: string })

    case 'ENABLE_CUSTOM_BACKEND_SYNC':
      return handleCustomBackendSync(message.payload as { baseUrl: string; syncOnChange: boolean })

    case 'DISABLE_CUSTOM_BACKEND_SYNC':
      return handleDisableCustomBackendSync()

    case 'GET_CUSTOM_BACKEND_SYNC_STATUS':
      return handleCustomBackendSyncStatus()

    case 'TRIGGER_CUSTOM_BACKEND_SYNC':
      return handleCustomBackendSync()

    case 'VERIFY_RECOVERY_PHRASE':
      return verifyRecoveryPhrase(message.payload as string)

    case 'GET_RECOVERY_STATUS':
      return getRecoveryStatus()

    case 'UPDATE_RECOVERY_VERIFIED':
      return updateRecoveryVerified()

    case 'DISMISS_RECOVERY_REMINDER':
      return dismissRecoveryReminder()

    case 'SHOULD_SHOW_BACKUP_REMINDER':
      return { success: true, data: await shouldShowBackupReminder() }

    case 'MARK_BACKUP_REMINDER_SHOWN':
      await markBackupReminderShown()
      return { success: true }

    case 'RESET_BACKUP_REMINDER':
      await resetBackupReminder()
      return { success: true }

    default:
      return { success: false, error: 'Unknown message type' }
  }
}
