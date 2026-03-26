// WebAuthn handler - can be called from background or popup

const webAuthnPromises: Record<string, { resolve: (value: { success?: boolean; data?: unknown; error?: string }) => void; reject: (error: Error) => void }> = {}

export async function webAuthnRegister(): Promise<{ success?: boolean; data?: unknown; error?: string }> {
  return new Promise(async (resolve, reject) => {
    const id = 'register_' + Date.now()
    webAuthnPromises[id] = { resolve, reject }

    const timeout = setTimeout(() => {
      if (webAuthnPromises[id]) {
        delete webAuthnPromises[id]
        reject(new Error('WebAuthn timeout - authentication took too long'))
      }
    }, 30000)

    try {
      console.log('Opening webauthn tab for registration')
      const tab = await chrome.tabs.create({
        url: chrome.runtime.getURL('webauthn.html?action=register&promiseId=' + id),
        active: true
      })
      console.log('Webauthn tab created:', tab.id)
    } catch (err: any) {
      clearTimeout(timeout)
      delete webAuthnPromises[id]
      reject(new Error('Failed to open WebAuthn tab: ' + err.message))
    }
  })
}

export async function webAuthnAuthenticate(payload: { credentialId: string; salt: string }): Promise<{ success?: boolean; data?: unknown; error?: string }> {
  return new Promise(async (resolve, reject) => {
    const id = 'authenticate_' + Date.now()
    webAuthnPromises[id] = { resolve, reject }

    const timeout = setTimeout(() => {
      if (webAuthnPromises[id]) {
        delete webAuthnPromises[id]
        reject(new Error('WebAuthn timeout - authentication took too long'))
      }
    }, 30000)

    const url = new URL(chrome.runtime.getURL('webauthn.html'))
    url.searchParams.set('action', 'authenticate')
    url.searchParams.set('credentialId', payload.credentialId)
    url.searchParams.set('salt', payload.salt)
    url.searchParams.set('promiseId', id)

    try {
      console.log('Opening webauthn tab for authentication')
      const tab = await chrome.tabs.create({
        url: url.toString(),
        active: true
      })
      console.log('Webauthn tab created:', tab.id)
    } catch (err: any) {
      clearTimeout(timeout)
      delete webAuthnPromises[id]
      reject(new Error('Failed to open WebAuthn tab: ' + err.message))
    }
  })
}

export function handleWebAuthnResult(payload: { promiseId: string; error?: string; success?: boolean; data?: unknown }): void {
  console.log('Received WEBAUTHN_RESULT for promiseId:', payload.promiseId)
  const handler = webAuthnPromises[payload.promiseId]
  
  if (handler) {
    delete webAuthnPromises[payload.promiseId]
    if (payload.error) {
      handler.reject(new Error(payload.error))
    } else {
      handler.resolve(payload)
    }
  } else {
    console.warn('No handler found for promiseId:', payload.promiseId)
  }
}