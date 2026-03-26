import { defineBackground } from 'wxt/sandbox'
import type { Message, MessageResponse } from '../utils/types'
import {
  getVaultState,
  createVault,
  unlockVault,
  lockVault,
  handleAddEntry,
  handleUpdateEntry,
  handleDeleteEntry,
  handleSearchEntries,
  handleGetEntryByUrl,
  handleExportVault,
  handleImportVault,
  handleUpdateSettings,
  handleClipboardCopy
} from '../utils/vault-ops'
import { handleWebAuthnResult } from '../utils/webauthn-handler'

export default defineBackground({
  main() {
    console.log('Background script initialized')
    
    chrome.runtime.onMessage.addListener(
      (message: Message, sender, sendResponse: (response: MessageResponse) => void) => {
        console.log('Received message:', message.type, 'from:', sender?.tab?.id || 'popup', 'tab url:', sender?.tab?.url || 'no tab')
        handleMessage(message, sender)
          .then((response) => {
            console.log('Responding with:', response)
            sendResponse(response)
          })
          .catch((error) => {
            console.error('Error handling message:', error)
            sendResponse({ success: false, error: error.message })
          })
        return true
      }
    )
    
    console.log('Message listener registered')
  }
})

async function handleMessage(message: Message, sender?: chrome.runtime.MessageSender): Promise<MessageResponse> {
  switch (message.type) {
    case 'GET_VAULT_STATE':
      return { success: true, data: await getVaultState() }

    case 'CREATE_VAULT':
      return createVault()

    case 'UNLOCK_VAULT':
      return unlockVault()

    case 'LOCK_VAULT':
      return lockVault()

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