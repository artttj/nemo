

import { bufferToBase64, base64ToBuffer, generateRandomBytes } from '~/utils/crypto'

const RP_ID = 'nemo.local'

// Debug logging disabled in production
const DEBUG = false
const debugLog = DEBUG ? console.log.bind(console) : () => {}
const debugError = DEBUG ? console.error.bind(console) : () => {}

async function handleAuth() {
  const params = new URLSearchParams(window.location.search)
  const action = params.get('action')
  const promiseId = params.get('promiseId')
  const credentialId = params.get('credentialId')
  const salt = params.get('salt')

  debugLog('WebAuthn params:', { action, promiseId, credentialId: credentialId ? '[REDACTED]' : null, salt: salt ? '[REDACTED]' : null })
  
  const statusEl = document.getElementById('status')!
  const errorEl = document.getElementById('error')!
  
  if (!promiseId) {
    errorEl.style.display = 'block'
    errorEl.textContent = 'Missing promiseId'
    debugError('Missing promiseId')
    return
  }
  
  try {
    if (action === 'register') {
      statusEl.textContent = 'Creating vault...'
      debugLog('Starting credential registration')
      const result = await registerCredential()
      debugLog('Registration successful')
      await sendResult({ success: true, data: result, promiseId })
      debugLog('Result sent to background')
      
      const spinnerEl = document.getElementById('spinner')
      const iconEl = document.getElementById('icon')
      const hintEl = document.getElementById('hint')
      
      if (spinnerEl) spinnerEl.style.display = 'none'
      if (iconEl) iconEl.style.display = 'block'
      statusEl.textContent = 'Vault created!'
      statusEl.className = 'success'
      if (hintEl) {
        hintEl.style.display = 'block'
        hintEl.textContent = 'Click the Nemo extension icon to continue'
      }
    } else if (action === 'authenticate' && credentialId && salt) {
      statusEl.textContent = 'Verifying identity...'
      debugLog('Starting authentication')
      const result = await authenticateWithCredential(credentialId, salt)
      await sendResult({ success: true, data: result, promiseId })
      debugLog('Result sent to background')
      
      const spinnerEl = document.getElementById('spinner')
      const iconEl = document.getElementById('icon')
      const hintEl = document.getElementById('hint')
      
      if (spinnerEl) spinnerEl.style.display = 'none'
      if (iconEl) iconEl.style.display = 'block'
      statusEl.textContent = 'Success!'
      statusEl.className = 'success'
      if (hintEl) {
        hintEl.style.display = 'block'
        hintEl.textContent = 'Click the Nemo extension icon to continue'
      }
    } else {
      throw new Error('Invalid request')
    }
  } catch (err) {
    debugError('WebAuthn error:', err)
    statusEl.textContent = 'Authentication failed'
    errorEl.style.display = 'block'
    errorEl.textContent = err instanceof Error ? err.message : 'Unknown error'
    await sendResult({ error: err instanceof Error ? err.message : 'Unknown error', promiseId })
  }
}

async function registerCredential() {
  const userId = generateRandomBytes(16)
  const challenge = generateRandomBytes(32)
  const prfSalt = generateRandomBytes(32)
  
  const credential = await navigator.credentials.create({
    publicKey: {
      rp: { id: RP_ID, name: 'Nemo Password Manager' },
      user: {
        id: userId as BufferSource,
        name: 'Nemo User',
        displayName: 'Vault Owner'
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 }
      ],
      challenge: challenge as BufferSource,
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'required'
      },
      attestation: 'direct',
      extensions: {
        prf: {
          eval: {
            first: prfSalt as BufferSource
          }
        }
      }
    }
  }) as PublicKeyCredential & {
    getClientExtensionResults(): AuthenticationExtensionsPRFOutputs
  }

  const response = credential.response as AuthenticatorAttestationResponse
  
  const prfOutput = credential.getClientExtensionResults?.()?.prf?.results?.first
  if (!prfOutput) {
    throw new Error('PRF extension not supported by this device. Please use a device that supports WebAuthn PRF.')
  }

  return {
    credentialId: bufferToBase64(new Uint8Array(credential.rawId)),
    publicKey: bufferToBase64(new Uint8Array(response.attestationObject)),
    rpId: RP_ID,
    createdAt: Date.now(),
    prfSalt: bufferToBase64(prfSalt),
    prfOutput: bufferToBase64(new Uint8Array(prfOutput as ArrayBuffer))
  }
}

async function authenticateWithCredential(credentialId: string, salt: string) {
  const challenge = generateRandomBytes(32)
  const prfSalt = base64ToBuffer(salt)
  
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: challenge as BufferSource,
      rpId: RP_ID,
      allowCredentials: [{
        type: 'public-key',
        id: base64ToBuffer(credentialId) as BufferSource,
        transports: ['internal']
      }],
      userVerification: 'required',
      extensions: {
        prf: {
          eval: {
            first: prfSalt as BufferSource
          }
        }
      }
    }
  }) as PublicKeyCredential & {
    getClientExtensionResults(): AuthenticationExtensionsPRFOutputs
  }

  const prfOutput = assertion.getClientExtensionResults?.()?.prf?.results?.first
  if (!prfOutput) {
    throw new Error('PRF extension not supported or authentication failed.')
  }

  return {
    prfOutput: bufferToBase64(new Uint8Array(prfOutput as ArrayBuffer))
  }
}

async function sendResult(result: Record<string, unknown>) {
  try {
    await chrome.runtime.sendMessage({
      type: 'WEBAUTHN_RESULT',
      payload: result
    })
    debugLog('Message sent successfully')
  } catch (err) {
    debugError('Failed to send result:', err)
    alert('Failed to communicate with extension. Please try again.')
  }
}

interface AuthenticationExtensionsPRFOutputs {
  prf?: {
    enabled?: boolean
    results?: {
      first?: ArrayBuffer
      second?: ArrayBuffer
    }
  }
}

handleAuth()
