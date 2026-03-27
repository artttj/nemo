const webAuthnPromises: Record<string, { resolve: (value: { success?: boolean; data?: unknown; error?: string }) => void; reject: (error: Error) => void; tabId?: number }> = {}

export async function webAuthnRegister(): Promise<{ success?: boolean; data?: unknown; error?: string }> {
  return webAuthnRegisterTab()
}

export async function webAuthnAuthenticate(payload: { credentialId: string; salt: string }): Promise<{ success?: boolean; data?: unknown; error?: string }> {
  return webAuthnAuthenticateTab(payload)
}

async function webAuthnRegisterTab(): Promise<{ success?: boolean; data?: unknown; error?: string }> {
  return new Promise(async (resolve, reject) => {
    const id = 'register_' + Date.now()
    webAuthnPromises[id] = { resolve, reject }

    const timeout = setTimeout(() => {
      const handler = webAuthnPromises[id]
      if (handler) {
        delete webAuthnPromises[id]
        if (handler.tabId) {
          chrome.tabs.remove(handler.tabId).catch(() => {})
        }
        reject(new Error('WebAuthn timeout'))
      }
    }, 30000)

    try {
      const tab = await chrome.tabs.create({
        url: chrome.runtime.getURL('webauthn.html?action=register&promiseId=' + id),
        active: true
      })
      
      if (tab.id) {
        webAuthnPromises[id].tabId = tab.id
      }
    } catch (err: any) {
      clearTimeout(timeout)
      delete webAuthnPromises[id]
      reject(new Error('Failed to open tab'))
    }
  })
}

async function webAuthnAuthenticateTab(payload: { credentialId: string; salt: string }): Promise<{ success?: boolean; data?: unknown; error?: string }> {
  return new Promise(async (resolve, reject) => {
    const id = 'authenticate_' + Date.now()
    webAuthnPromises[id] = { resolve, reject }

    const timeout = setTimeout(() => {
      const handler = webAuthnPromises[id]
      if (handler) {
        delete webAuthnPromises[id]
        if (handler.tabId) {
          chrome.tabs.remove(handler.tabId).catch(() => {})
        }
        reject(new Error('WebAuthn timeout'))
      }
    }, 30000)

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
      clearTimeout(timeout)
      delete webAuthnPromises[id]
      reject(new Error('Failed to open tab'))
    }
  })
}

export function handleWebAuthnResult(payload: { promiseId: string; error?: string; success?: boolean; data?: unknown }): void {
  const handler = webAuthnPromises[payload.promiseId]
  
  if (handler) {
    const { tabId } = handler
    delete webAuthnPromises[payload.promiseId]
    
    if (tabId) {
      chrome.tabs.remove(tabId).catch(() => {})
    }
    
    if (payload.error) {
      handler.reject(new Error(payload.error))
    } else {
      handler.resolve(payload)
    }
  }
}
