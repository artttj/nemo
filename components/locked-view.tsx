import React, { useState, useEffect } from 'react'

interface LockedViewProps {
  onUnlock: () => Promise<void>
  onCreate: () => Promise<void>
  onRecoveryUnlock?: (phrase: string) => Promise<void>
  onRecoveryCreate?: (phrase: string) => Promise<void>
  onPinUnlock?: (pin: string) => Promise<void>
  vaultExists?: boolean
  hasCredential?: boolean
  hasPinSetup?: boolean
  entryCount?: number
  lastSync?: number
}

export function LockedView({ 
  onUnlock, 
  onCreate, 
  onRecoveryUnlock, 
  onRecoveryCreate, 
  onPinUnlock, 
  vaultExists, 
  hasCredential, 
  hasPinSetup,
  entryCount = 0,
  lastSync
}: LockedViewProps) {
  const [loading, setLoading] = useState<'unlock' | 'create' | 'recovery' | 'pin' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showRecovery, setShowRecovery] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [recoveryPhrase, setRecoveryPhrase] = useState('')
  const [pin, setPin] = useState('')
  const [masterKeyInput, setMasterKeyInput] = useState('')
  const [showMasterKey, setShowMasterKey] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState<'touchid' | 'hello' | null>(null)

  const showFirstTime = !vaultExists || !hasCredential

  useEffect(() => {
    if (isUnlocking) {
      const timer = setTimeout(() => setIsUnlocking(false), 1200)
      return () => clearTimeout(timer)
    }
  }, [isUnlocking])

  useEffect(() => {
    const platform = navigator.platform.toLowerCase()
    if (platform.includes('mac') || platform.includes('iphone') || platform.includes('ipad')) {
      setBiometricAvailable('touchid')
    } else if (platform.includes('win')) {
      setBiometricAvailable('hello')
    }
  }, [])

  const handleUnlock = async () => {
    setLoading('unlock')
    setError(null)
    setIsUnlocking(true)
    try {
      await onUnlock()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock')
      setIsUnlocking(false)
    } finally {
      setLoading(null)
    }
  }

  const handleCreate = async () => {
    setLoading('create')
    setError(null)
    setIsUnlocking(true)
    try {
      await onCreate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vault')
      setIsUnlocking(false)
    } finally {
      setLoading(null)
    }
  }

  const handleRecoveryUnlock = async () => {
    if (!recoveryPhrase.trim()) {
      setError('Enter your seed phrase')
      return
    }
    const words = recoveryPhrase.trim().split(/\s+/)
    if (words.length !== 12) {
      setError('Seed phrase must be 12 words')
      return
    }
    setLoading('recovery')
    setError(null)
    try {
      await onRecoveryUnlock?.(recoveryPhrase.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid seed phrase')
    } finally {
      setLoading(null)
    }
  }

  const handleRecoveryCreate = async () => {
    const words = recoveryPhrase.trim().split(/\s+/)
    if (words.length !== 12) {
      setError('Seed phrase must be 12 words')
      return
    }
    setLoading('recovery')
    setError(null)
    try {
      await onRecoveryCreate?.(recoveryPhrase.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vault')
    } finally {
      setLoading(null)
    }
  }

  const handlePinUnlock = async () => {
    if (!pin || pin.length < 4) {
      setError('Enter your PIN')
      return
    }
    setLoading('pin')
    setError(null)
    setIsUnlocking(true)
    try {
      await onPinUnlock?.(pin)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock')
      setIsUnlocking(false)
    } finally {
      setLoading(null)
    }
  }

  const handlePinKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePinUnlock()
    }
  }

  const handleMasterKeyUnlock = async () => {
    if (!masterKeyInput.trim()) {
      setError('Enter your master key')
      return
    }
    setLoading('recovery')
    setError(null)
    setIsUnlocking(true)
    try {
      await onRecoveryUnlock?.(masterKeyInput.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid master key')
      setIsUnlocking(false)
    } finally {
      setLoading(null)
    }
  }

  if (showRecovery) {
    return (
      <div className="w-[400px] min-h-[560px] flex flex-col bg-[var(--void)]">
        <div className="flex items-center justify-between px-5 py-5 border-b border-[var(--border)]">
          <button 
            onClick={() => { setShowRecovery(false); setRecoveryPhrase(''); setError(null); }}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors text-sm font-medium flex items-center gap-2 px-2 py-1 -ml-2 rounded-lg hover:bg-[var(--surface)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="font-brand text-[var(--gold)] text-lg tracking-wider">NEMO</div>
        </div>

        <div className="flex-1 px-5 py-8 flex flex-col">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              {showFirstTime ? 'Create vault from recovery' : 'Restore your vault'}
            </h1>
            <p className="text-[var(--text-secondary)] text-[15px] leading-relaxed">
              {showFirstTime 
                ? 'Enter your 12-word recovery phrase to create a new vault.'
                : 'Enter your 12-word recovery phrase to restore access to your passwords.'}
            </p>
          </div>
          
          <div className="flex-1">
            <textarea
              value={recoveryPhrase}
              onChange={(e) => {
                setRecoveryPhrase(e.target.value)
                if (error) setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  showFirstTime ? handleRecoveryCreate() : handleRecoveryUnlock()
                }
              }}
              placeholder="word1 word2 word3..."
              rows={6}
              autoFocus
              className="w-full nemo-input p-4 text-[15px] resize-none"
              style={{ minHeight: '140px' }}
            />
            
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-[var(--text-tertiary)]">
                {recoveryPhrase.trim().split(/\s+/).filter(Boolean).length} / 12 words
              </span>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-[var(--danger-bg)] rounded-xl border border-[var(--danger)] border-opacity-20">
              <p className="text-[var(--danger)] text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={showFirstTime ? handleRecoveryCreate : handleRecoveryUnlock}
              disabled={loading !== null || !recoveryPhrase.trim()}
              className="w-full nemo-button-primary py-4 text-[15px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'recovery' 
                ? (showFirstTime ? 'Creating...' : 'Restoring...') 
                : (showFirstTime ? 'Create vault' : 'Restore vault')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showPin) {
    return (
      <div className="w-[400px] min-h-[560px] flex flex-col bg-[var(--void)]">
        <div className="flex items-center justify-between px-5 py-5 border-b border-[var(--border)]">
          <button 
            onClick={() => { setShowPin(false); setPin(''); setError(null); }}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors text-sm font-medium flex items-center gap-2 px-2 py-1 -ml-2 rounded-lg hover:bg-[var(--surface)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="font-brand text-[var(--gold)] text-lg tracking-wider">NEMO</div>
        </div>

        <div className="flex-1 px-5 py-12 flex flex-col">
          <div className="mb-10 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--surface)] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              Enter PIN
            </h1>
            <p className="text-[var(--text-secondary)] text-[15px]">
              Unlock with your device PIN
            </p>
          </div>
          
          <div className="flex-1 flex flex-col items-center">
            <div className="flex gap-3 mb-8">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    i < pin.length
                      ? 'bg-[var(--gold)] scale-110'
                      : 'bg-[var(--border)]'
                  }`}
                />
              ))}
            </div>
            
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                setPin(value)
                if (error) setError(null)
              }}
              onKeyDown={handlePinKeyDown}
              autoFocus
              className="sr-only"
              aria-label="PIN input"
            />

            <div className="grid grid-cols-3 gap-4 max-w-[240px]">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    if (key === 'del') {
                      setPin(pin.slice(0, -1))
                    } else if (key && pin.length < 6) {
                      setPin(pin + key)
                    }
                  }}
                  disabled={key === '' || loading !== null}
                  className={`w-[72px] h-[72px] rounded-2xl text-2xl font-semibold transition-all ${
                    key === ''
                      ? 'invisible'
                      : key === 'del'
                        ? 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--void-elevated)]'
                        : 'bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--void-elevated)] active:scale-95'
                  } disabled:opacity-50`}
                >
                  {key === 'del' ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12H9M9 12l-4-4m4 4l-4 4m4-4H3" />
                    </svg>
                  ) : (
                    key
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-[var(--danger-bg)] rounded-xl border border-[var(--danger)] border-opacity-20">
              <p className="text-[var(--danger)] text-sm font-medium text-center">{error}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const formatSyncTime = (timestamp: number | undefined) => {
    if (!timestamp) return 'Offline'
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  const getBiometricLabel = () => {
    if (!showFirstTime) {
      if (biometricAvailable === 'touchid') return 'Unlock with Touch ID'
      if (biometricAvailable === 'hello') return 'Unlock with Windows Hello'
    }
    return showFirstTime ? 'Create vault' : 'Unlock vault'
  }

  const syncText = formatSyncTime(lastSync)

  return (
    <div className="w-[400px] min-h-[420px] flex flex-col bg-[var(--void)]">
      {isUnlocking && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--void)] animate-scale-in">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[var(--gold)] flex items-center justify-center shadow-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p className="text-[var(--text-primary)] font-semibold">Unlocking...</p>
          </div>
        </div>
      )}

      <div className="px-5 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[var(--surface)] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <span className="font-semibold text-[var(--text-primary)] text-base">Nemo</span>
        </div>
      </div>

      <div className="flex-1 px-5 py-3 flex flex-col">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-0.5">
          {showFirstTime ? 'Create vault' : 'Unlock vault'}
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mb-3">
          {showFirstTime 
            ? 'End-to-end encrypted password storage'
            : `${entryCount} ${entryCount === 1 ? 'password' : 'passwords'} · ${syncText}`}
        </p>

        {error && (
          <div className="mb-3 p-3 bg-[var(--danger-bg)] rounded-lg border border-[var(--danger)]/20">
            <p className="text-[var(--danger)] text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={showFirstTime ? handleCreate : handleUnlock}
            disabled={loading !== null}
            className="w-full nemo-button-primary py-3 text-[15px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === 'create' || loading === 'unlock'
              ? 'Verifying...'
              : getBiometricLabel()}
          </button>

          {!showFirstTime && !showMasterKey && (
            <button
              onClick={() => setShowMasterKey(true)}
              disabled={loading !== null}
              className="w-full nemo-button-secondary py-2.5 text-[14px] font-medium"
            >
              Use master password
            </button>
          )}

          {!showFirstTime && showMasterKey && (
            <div className="space-y-2 mt-1">
              <textarea
                value={masterKeyInput}
                onChange={(e) => {
                  setMasterKeyInput(e.target.value)
                  if (error) setError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleMasterKeyUnlock()
                  }
                }}
                placeholder="Enter your 12-word recovery phrase..."
                rows={3}
                autoFocus
                className="w-full nemo-input px-3 py-2.5 text-sm resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowMasterKey(false); setMasterKeyInput(''); setError(null); }}
                  className="flex-1 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMasterKeyUnlock}
                  disabled={loading !== null || !masterKeyInput.trim()}
                  className="flex-1 py-2 bg-[var(--surface)] hover:bg-[var(--void-elevated)] text-[var(--text-primary)] rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === 'recovery' ? 'Unlocking...' : 'Unlock'}
                </button>
              </div>
            </div>
          )}

          {hasPinSetup && !showFirstTime && !showMasterKey && (
            <button
              onClick={() => setShowPin(true)}
              disabled={loading !== null}
              className="w-full py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Use PIN code
            </button>
          )}
        </div>
      </div>

      <div className="px-5 py-3 mt-auto">
        <div className="flex items-center gap-2 p-3 bg-[var(--surface)] rounded-lg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <div className="flex-1">
            <p className="text-[var(--text-primary)] text-xs font-medium">Encrypted on this device</p>
            <p className="text-[var(--text-tertiary)] text-[11px]">Your data never leaves unencrypted</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-[var(--border)]">
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-tertiary)] text-xs">Can't access vault?</span>
          <button
            onClick={() => setShowRecovery(true)}
            disabled={loading !== null}
            className="text-[var(--gold)] hover:opacity-80 text-xs font-medium transition-opacity"
          >
            Use recovery phrase
          </button>
        </div>
      </div>
    </div>
  )
}
