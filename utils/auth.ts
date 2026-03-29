/**
 * Copyright 2024-2025 Artem Iagovdik <artyom.yagovdik@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import { base64ToBuffer } from './crypto'
import { webAuthnRegister, webAuthnAuthenticate } from './webauthn-handler'
import { deriveWrappingKeyFromPrf } from './crypto'

interface WebAuthnCredential {
  credentialId: string
  publicKey: string
  rpId: string
  createdAt: number
  prfSalt: string
  prfOutput: string
}

interface WrappedKeyData {
  wrappingKey: CryptoKey
  credentialId: string
}

async function getStorageItem(key: string): Promise<string | null> {
  const result = await chrome.storage.local.get(key)
  return result[key] || null
}

async function setStorageItem(key: string, value: string): Promise<void> {
  await chrome.storage.local.set({ [key]: value })
}

async function removeStorageItem(key: string): Promise<void> {
  await chrome.storage.local.remove(key)
}

export async function isWebAuthnSupported(): Promise<boolean> {
  return typeof PublicKeyCredential !== 'undefined'
}

export async function isBiometricSupported(): Promise<boolean> {
  if (typeof PublicKeyCredential === 'undefined') return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export async function registerCredential(): Promise<WebAuthnCredential> {
  const response = await webAuthnRegister()

  if (response.error) {
    throw new Error(response.error)
  }

  return response.data as WebAuthnCredential
}

export async function deriveKeyFromPrfOutput(
  prfOutputBase64: string,
  salt: string
): Promise<CryptoKey> {
  const prfOutputBuffer = base64ToBuffer(prfOutputBase64).buffer as ArrayBuffer
  return deriveWrappingKeyFromPrf(prfOutputBuffer, salt)
}

export async function authenticateWithCredential(
  credentialId: string,
  salt: string
): Promise<WrappedKeyData> {
  const response = await webAuthnAuthenticate({ credentialId, salt })

  if (response.error) {
    throw new Error(response.error)
  }

  const { prfOutput } = response.data as { prfOutput: string }
  const wrappingKey = await deriveKeyFromPrfOutput(prfOutput, salt)

  return { wrappingKey, credentialId }
}

export async function hasStoredCredential(): Promise<boolean> {
  const stored = await getStorageItem('nemo_credential_id')
  return stored !== null
}

export async function storeCredential(credential: WebAuthnCredential): Promise<void> {
  await setStorageItem('nemo_credential_id', credential.credentialId)
  await setStorageItem('nemo_credential_created', credential.createdAt.toString())
  await setStorageItem('nemo_prf_salt', credential.prfSalt)
}

export async function getStoredCredentialId(): Promise<string | null> {
  return await getStorageItem('nemo_credential_id')
}

export async function clearStoredCredential(): Promise<void> {
  await removeStorageItem('nemo_credential_id')
  await removeStorageItem('nemo_credential_created')
  await removeStorageItem('nemo_prf_salt')
}
