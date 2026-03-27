import { defineBackground } from 'wxt/sandbox'
import type { Message, MessageResponse } from '../utils/types'
import {
  getVaultState,
  createVault,
  createVaultFromRecovery,
  unlockVault,
  unlockVaultFromRecovery,
  unlockVaultWithPin,
  lockVault,
  handleAddEntry,
  handleUpdateEntry,
  handleDeleteEntry,
  handleSearchEntries,
  handleGetEntryByUrl,
  handleExportVault,
  handleImportVault,
  handleUpdateSettings,
  handleClipboardCopy,
  checkVaultExists,
  hasPinConfigured,
  getVaultList,
  switchVault,
  createNewVaultInRegistry,
  renameVault,
  deleteVault
} from '../utils/vault-ops'
import { handleWebAuthnResult } from '../utils/webauthn-handler'
import { setActiveVault as setVaultActive } from '../utils/vault'

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
  }
})

async function handleMessage(message: Message, sender?: chrome.runtime.MessageSender): Promise<MessageResponse> {
  switch (message.type) {
    case 'GET_VAULT_STATE':
      return { success: true, data: await getVaultState() }

    case 'CHECK_VAULT_EXISTS':
      return { success: true, data: await checkVaultExists() }

    case 'HAS_PIN_SETUP':
      return { success: true, data: await hasPinConfigured() }

    case 'GET_VAULT_REGISTRY':
      return getVaultList()

    case 'SET_ACTIVE_VAULT':
      const vaultId = message.payload as string
      const setActiveResult = await setVaultActive(vaultId)
      if (setActiveResult) {
        return switchVault(vaultId)
      }
      return { success: false, error: 'Vault not found' }

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

    case 'GET_ENTRIES': {
      const state = await getVaultState()
      return { success: true, data: state.vault?.entries ?? [] }
    }

    case 'GET_ENTRIES_FOR_AUTOFILL': {
      const autofillState = await getVaultState()
      if (!autofillState.isUnlocked || !autofillState.vault) {
        return { success: false, error: 'Vault is locked' }
      }
      return { success: true, data: autofillState.vault.entries }
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

    default:
      return { success: false, error: 'Unknown message type' }
  }
}
