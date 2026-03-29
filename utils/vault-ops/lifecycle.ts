

import type { MessageResponse, Vault, VaultMetadata } from "../types"
import {
  vaultExists,
  initializeVault,
  loadVault,
  loadVaultMetadata,
  loadVaultKey,
  storeRecoveryData,
  loadRecoveryData
} from "../vault"
import {
  registerCredential,
  storeCredential,
  getStoredCredentialId,
  deriveKeyFromPrfOutput,
  authenticateWithCredential
} from "../auth"
import {
  deriveKeyFromPhrase,
  createRecoveryBackup,
  recoverVaultKey
} from "../../vault/recovery"
import { generateRandomBytes, bufferToBase64 } from "../crypto"
import {
  activateVault,
  lockSession,
  getSessionKey,
  setSessionKey,
  getCurrentVaultState,
  setCurrentVaultState,
  resetAutoLock,
  INITIAL_VAULT
} from "./session"

export async function checkVaultExists(): Promise<{ exists: boolean; hasCredential: boolean }> {
  const { hasStoredCredential } = await import('../auth')
  const hasCredential = await hasStoredCredential()
  const exists = await vaultExists()
  return { exists, hasCredential }
}

export async function createVault(): Promise<MessageResponse<{ metadata: VaultMetadata; recoveryPhrase: string }>> {
  try {
    const credential = await registerCredential()
    await storeCredential(credential)

    const wrappingKey = await deriveKeyFromPrfOutput(credential.prfOutput, credential.prfSalt)
    const { metadata, vaultKey } = await initializeVault(wrappingKey, credential.prfSalt)

    const { phrase, encryptedData } = await createRecoveryBackup(vaultKey, metadata.vaultId)
    await storeRecoveryData(encryptedData)

    await activateVault(vaultKey, INITIAL_VAULT, metadata)

    return { success: true, data: { metadata, recoveryPhrase: phrase } }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create vault"
    }
  }
}

export async function createVaultWithOptions(
  recoveryPhrase: string,
  enableTouchId: boolean
): Promise<MessageResponse<{ metadata: VaultMetadata }>> {
  try {
    const recoveryKey = await deriveKeyFromPhrase(recoveryPhrase)
    const salt = bufferToBase64(generateRandomBytes(32))

    let primaryWrappingKey: CryptoKey
    let wrappingSalt = salt

    if (enableTouchId) {
      const credential = await registerCredential()
      await storeCredential(credential)
      primaryWrappingKey = await deriveKeyFromPrfOutput(credential.prfOutput, credential.prfSalt)
      wrappingSalt = credential.prfSalt
    } else {
      primaryWrappingKey = recoveryKey
    }

    const { metadata, vaultKey } = await initializeVault(primaryWrappingKey, wrappingSalt)

    const { encryptedData } = await createRecoveryBackup(vaultKey, metadata.vaultId, recoveryPhrase)
    await storeRecoveryData(encryptedData)

    await activateVault(vaultKey, INITIAL_VAULT, metadata)

    return { success: true, data: { metadata } }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create vault"
    }
  }
}

export async function createVaultFromRecovery(phrase: string): Promise<MessageResponse<VaultMetadata>> {
  try {
    const recoveryKey = await deriveKeyFromPhrase(phrase)
    const salt = bufferToBase64(generateRandomBytes(32))

    const { metadata, vaultKey } = await initializeVault(recoveryKey, salt)

    const { encryptedData } = await createRecoveryBackup(vaultKey, metadata.vaultId, phrase)
    await storeRecoveryData(encryptedData)

    await activateVault(vaultKey, INITIAL_VAULT, metadata)

    return { success: true, data: metadata }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create vault from recovery phrase"
    }
  }
}

export async function unlockVault(): Promise<MessageResponse<Vault>> {
  try {
    const credentialId = await getStoredCredentialId()
    if (!credentialId) {
      return { success: false, error: "No credential stored" }
    }

    const existingVault = await vaultExists()
    if (!existingVault) {
      return { success: false, error: "No vault found. Create a vault first." }
    }

    const metadata = await loadVaultMetadata()
    if (!metadata) {
      return { success: false, error: "Failed to load vault metadata" }
    }

    const { wrappingKey } = await authenticateWithCredential(credentialId, metadata.salt)

    const vaultKey = await loadVaultKey(wrappingKey)
    if (!vaultKey) {
      return { success: false, error: "Failed to unwrap vault key" }
    }

    setSessionKey(vaultKey)

    const vault = await loadVault(vaultKey)
    if (!vault) {
      return { success: false, error: "Failed to decrypt vault" }
    }

    setCurrentVaultState({
      isUnlocked: true,
      vault,
      metadata,
      lastActivity: Date.now()
    })

    resetAutoLock()

    return { success: true, data: vault }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to unlock vault"
    }
  }
}

export async function unlockVaultFromRecovery(phrase: string): Promise<MessageResponse<Vault>> {
  try {
    const existingVault = await vaultExists()
    if (!existingVault) {
      return { success: false, error: "No vault found. Create a vault first." }
    }

    const recoveryData = await loadRecoveryData()
    if (!recoveryData) {
      return { success: false, error: "No recovery data found for this vault." }
    }

    const metadata = await loadVaultMetadata()
    if (!metadata) {
      return { success: false, error: "Failed to load vault metadata" }
    }

    const vaultKey = await recoverVaultKey(phrase, recoveryData)
    setSessionKey(vaultKey)

    const vault = await loadVault(vaultKey)
    if (!vault) {
      return { success: false, error: "Failed to decrypt vault" }
    }

    setCurrentVaultState({
      isUnlocked: true,
      vault,
      metadata,
      lastActivity: Date.now()
    })

    resetAutoLock()

    return { success: true, data: vault }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to unlock vault"
    }
  }
}

export async function lockVault(): Promise<MessageResponse> {
  await lockSession()
  return { success: true }
}
