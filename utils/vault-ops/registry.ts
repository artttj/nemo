

import type { MessageResponse, VaultRegistry, VaultInfo } from "../types"
import {
  getVaultRegistry,
  setActiveVault as setVaultActive,
  renameVault as renameVaultInStorage,
  deleteVaultFromRegistry,
  loadVault,
  loadVaultMetadata
} from "../vault"
import {
  getSessionKey,
  setSessionKey,
  getCurrentVaultState,
  setCurrentVaultState,
  resetAutoLock
} from "./session"

export async function getVaultList(): Promise<MessageResponse<VaultRegistry>> {
  try {
    const registry = await getVaultRegistry()
    return { success: true, data: registry }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get vault list"
    }
  }
}

export async function switchVault(vaultId: string): Promise<MessageResponse> {
  try {
    const { setActiveVault, loadVault, loadVaultMetadata } = await import("../vault")
    const success = await setActiveVault(vaultId)
    if (!success) {
      return { success: false, error: "Vault not found" }
    }

    const sessionKey = getSessionKey()
    if (sessionKey) {
      try {
        const metadata = await loadVaultMetadata()
        if (metadata) {
          const vault = await loadVault(sessionKey)
          if (vault) {
            setCurrentVaultState({
              isUnlocked: true,
              vault,
              metadata,
              lastActivity: Date.now()
            })
            resetAutoLock()
            return { success: true }
          }
        }
      } catch {
      }
    }

    setCurrentVaultState({
      isUnlocked: false,
      vault: null,
      metadata: null,
      lastActivity: Date.now()
    })
    setSessionKey(null)

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to switch vault"
    }
  }
}

export async function createNewVaultInRegistry(name: string): Promise<MessageResponse<VaultInfo>> {
  try {
    const { createNewVault } = await import("../vault")
    const sessionKey = getSessionKey()

    const result = await createNewVault(name, sessionKey || undefined)
    return {
      success: true,
      data: {
        id: result.vaultId,
        name: result.metadata.name,
        createdAt: result.metadata.createdAt,
        updatedAt: result.metadata.updatedAt,
        entryCount: 0
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create vault"
    }
  }
}

export async function renameVault(vaultId: string, name: string): Promise<MessageResponse> {
  try {
    const success = await renameVaultInStorage(vaultId, name)
    if (!success) {
      return { success: false, error: "Vault not found" }
    }
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to rename vault"
    }
  }
}

export async function deleteVault(vaultId: string): Promise<MessageResponse> {
  try {
    const sessionKey = getSessionKey()
    const vaultState = getCurrentVaultState()
    if (sessionKey && vaultState.metadata?.vaultId === vaultId) {
      setSessionKey(null)
      setCurrentVaultState({
        isUnlocked: false,
        vault: null,
        metadata: null,
        lastActivity: Date.now()
      })
    }

    const success = await deleteVaultFromRegistry(vaultId)
    if (!success) {
      return { success: false, error: "Vault not found" }
    }
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete vault"
    }
  }
}
