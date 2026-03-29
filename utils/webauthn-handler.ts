/**
 * Copyright 2024-2026 Artem Iagovdik <artyom.yagovdik@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

const webAuthnPromises: Record<string, {
  resolve: (value: { success?: boolean; data?: unknown; error?: string }) => void;
  reject: (error: Error) => void;
  tabId?: number;
  timeout: ReturnType<typeof setTimeout>;
}> = {}

const WEBAUTHN_TIMEOUT_MS = 30000

export async function webAuthnRegister(): Promise<{ success?: boolean; data?: unknown; error?: string }> {
  return webAuthnRegisterTab()
}

export async function webAuthnAuthenticate(payload: { credentialId: string; salt: string }): Promise<{ success?: boolean; data?: unknown; error?: string }> {
  return webAuthnAuthenticateTab(payload)
}

function generatePromiseId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

async function webAuthnRegisterTab(): Promise<{ success?: boolean; data?: unknown; error?: string }> {
  return new Promise(async (resolve, reject) => {
    const id = generatePromiseId()

    const timeout = setTimeout(() => {
      cleanupPromise(id)
      reject(new Error('WebAuthn timeout'))
    }, WEBAUTHN_TIMEOUT_MS)

    webAuthnPromises[id] = { resolve, reject, timeout }

    try {
      const tab = await chrome.tabs.create({
        url: chrome.runtime.getURL('webauthn.html?action=register&promiseId=' + id),
        active: true
      })

      if (tab.id) {
        webAuthnPromises[id].tabId = tab.id
      }
    } catch (err: any) {
      cleanupPromise(id)
      reject(new Error('Failed to open tab'))
    }
  })
}

async function webAuthnAuthenticateTab(payload: { credentialId: string; salt: string }): Promise<{ success?: boolean; data?: unknown; error?: string }> {
  return new Promise(async (resolve, reject) => {
    const id = generatePromiseId()

    const timeout = setTimeout(() => {
      cleanupPromise(id)
      reject(new Error('WebAuthn timeout'))
    }, WEBAUTHN_TIMEOUT_MS)

    webAuthnPromises[id] = { resolve, reject, timeout }

    const url = new URL(chrome.runtime.getURL('webauthn.html'))
    url.searchParams.set('action', 'authenticate')
    url.searchParams.set('credentialId', payload.credentialId)
    url.searchParams.set('salt', payload.salt)
    url.searchParams.set('promiseId', id)

    try {
      const tab = await chrome.tabs.create({
        url: url.toString(),
        active: true
      })

      if (tab.id) {
        webAuthnPromises[id].tabId = tab.id
      }
    } catch (err: any) {
      cleanupPromise(id)
      reject(new Error('Failed to open tab'))
    }
  })
}

function cleanupPromise(id: string): void {
  const handler = webAuthnPromises[id]
  if (!handler) return

  clearTimeout(handler.timeout)
  if (handler.tabId) {
    chrome.tabs.remove(handler.tabId).catch(() => {})
  }
  delete webAuthnPromises[id]
}

export function handleWebAuthnResult(payload: { promiseId: string; error?: string; success?: boolean; data?: unknown }): void {
  const handler = webAuthnPromises[payload.promiseId]
  if (!handler) return

  cleanupPromise(payload.promiseId)

  if (payload.error) {
    handler.reject(new Error(payload.error))
  } else {
    handler.resolve(payload)
    chrome.action.openPopup?.().catch(() => {})
  }
}
