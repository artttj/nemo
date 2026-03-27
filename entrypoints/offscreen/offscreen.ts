import { bufferToBase64, base64ToBuffer, generateRandomBytes } from '~/utils/crypto'

const RP_ID = 'nemo.local'

console.log('Offscreen WebAuthn document loaded')

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'WEBAUTHN_REGISTER') {
    handleRegister(message.payload)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }))
    return true // Async response
  }
  
  if (message.type === 'WEBAUTHN_AUTHENTICATE') {
    handleAuthenticate(message.payload)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }))
    return true
  }
})

async function handleRegister(payload: { userId?: string }) {
  const userId = payload.userId ? base64ToBuffer(payload.userId) : generateRandomBytes(16)
  const challenge = generateRandomBytes(32)
  const prfSalt = generateRandomBytes(32)
  
  const credential = await navigator.credentials.create({
    publicKey: {
      rp: { id: RP_ID, name: 'Nemo Password Manager' },
      user: {
        id: userId as unknown as BufferSource,
        name: 'Nemo User',
        displayName: 'Vault Owner'
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 }
      ],
      challenge: challenge as unknown as BufferSource,
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'required'
      },
      attestation: 'direct',
      extensions: {
        prf: {
          eval: {
            first: prfSalt as unknown as BufferSource
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
    prfOutput: bufferToBase64(new Uint8Array(prfOutput))
  }
}

async function handleAuthenticate(payload: { credentialId: string; salt: string }) {
  const { credentialId, salt } = payload
  const challenge = generateRandomBytes(32)
  const prfSalt = base64ToBuffer(salt)
  
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: challenge as unknown as BufferSource,
      rpId: RP_ID,
      allowCredentials: [{
        type: 'public-key',
        id: base64ToBuffer(credentialId) as unknown as BufferSource,
        transports: ['internal'] as AuthenticatorTransport[]
      }],
      userVerification: 'required',
      extensions: {
        prf: {
          eval: {
            first: prfSalt as unknown as BufferSource
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
    prfOutput: bufferToBase64(new Uint8Array(prfOutput))
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
