

import React, { useState, useEffect } from 'react'
import { useBiometricType } from '~/utils/biometric'

interface LockedViewProps {
  onUnlock: () => Promise<void>
  onCreate: () => Promise<void>
  onRecoveryUnlock?: (phrase: string) => Promise<void>
  onRecoveryCreate?: (phrase: string) => Promise<void>
  onPinUnlock?: (pin: string) => Promise<void>
  vaultExists?: boolean
  hasCredential?: boolean
  hasPinSetup?: boolean
  pinLength?: number
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
  pinLength = 4,
  entryCount = 0,
  lastSync
}: LockedViewProps) {
  const [loading, setLoading] = useState<'unlock' | 'create' | 'recovery' | 'pin' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showRecovery, setShowRecovery] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [recoveryPhrase, setRecoveryPhrase] = useState('')
  const [pin, setPin] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)
  const biometricAvailable = useBiometricType()

  const showFirstTime = vaultExists === false

  useEffect(() => {
    if (!isUnlocking) return
    const timer = setTimeout(() => setIsUnlocking(false), 1200)
    return () => clearTimeout(timer)
  }, [isUnlocking])

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
          <div className="font-brand text-[var(--accent)] text-lg tracking-wider">NEMO</div>
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
              className="w-full nemo-input p-4 text-[15px] resize-none min-h-[140px]"
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
          <div className="font-brand text-[var(--accent)] text-lg tracking-wider">NEMO</div>
        </div>

        <div className="flex-1 px-5 py-12 flex flex-col">
          <div className="mb-10 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--surface)] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              Enter PIN
            </h1>
            <p className="text-[var(--text-secondary)] text-[15px]">
              Unlock with your device PIN ({pinLength} digits)
            </p>
          </div>

          <div className="flex-1 flex flex-col items-center">
            <div className="flex gap-3 mb-8">
              {Array.from({ length: pinLength }).map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-[background-color,transform] duration-200 ${
                    i < pin.length
                      ? 'bg-[var(--accent)] scale-110'
                      : 'bg-[var(--border)]'
                  }`}
                />
              ))}
            </div>

            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={pinLength}
              value={pin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, pinLength)
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
                    } else if (key && pin.length < pinLength) {
                      setPin(pin + key)
                    }
                  }}
                  disabled={
                    key === '' ||
                    loading !== null ||
                    (key !== '' && key !== 'del' && pin.length >= pinLength)
                  }
                  className={`w-[72px] h-[72px] rounded-2xl text-2xl font-semibold transition-[background-color,transform] ${
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

            <button
              onClick={handlePinUnlock}
              disabled={pin.length !== pinLength || loading !== null}
              className="mt-6 w-full max-w-[240px] py-3 bg-[var(--accent)] hover:opacity-90 text-[var(--accent-text)] rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'pin' ? 'Unlocking...' : 'Unlock'}
            </button>
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

  const getBiometricLabel = () => {
    if (showFirstTime) return 'Create vault'
    if (biometricAvailable === 'touchid') return 'Unlock with Touch ID'
    if (biometricAvailable === 'hello') return 'Unlock with Windows Hello'
    return 'Unlock vault'
  }

  const getMainAction = () => {
    if (showFirstTime) return handleCreate
    return handleUnlock
  }

  if (vaultExists === undefined) {
    return (
      <div className="w-[400px] min-h-[420px] flex items-center justify-center bg-[var(--void)]">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-3 rounded-lg bg-[var(--accent)] animate-pulse"></div>
          <p className="text-[var(--text-secondary)] text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-[400px] min-h-[420px] flex flex-col bg-[var(--void)]">
      {isUnlocking && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--void)] animate-scale-in">
          <div className="text-center">
            <div className="w-11 h-11 mx-auto mb-3 rounded-xl bg-[var(--accent)] flex items-center justify-center nemo-brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p className="text-[var(--text-primary)] font-semibold text-sm">Unlocking...</p>
          </div>
        </div>
      )}

      <div className="px-5 pt-5 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center nemo-brand-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <span className="font-semibold text-[var(--text-primary)] text-[15px]">Nemo</span>
        </div>
      </div>

      <div className="flex-1 px-5 py-3 flex flex-col">
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-0.5">
          {showFirstTime ? 'Create vault' : 'Welcome back'}
        </h1>
        <p className="text-[var(--text-tertiary)] text-[13px] mb-4">
          {showFirstTime
            ? 'End-to-end encrypted password storage'
            : `${entryCount} ${entryCount === 1 ? 'password' : 'passwords'} stored securely`}
        </p>

        {error && (
          <div className="mb-3 p-3 bg-[var(--danger-bg)] rounded-lg border border-[var(--danger)]/20">
            <p className="text-[var(--danger)] text-[13px] font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={getMainAction()}
            disabled={loading !== null}
            className="w-full nemo-button-primary py-3 text-[14px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === 'create' || loading === 'unlock'
              ? 'Verifying...'
              : getBiometricLabel()}
          </button>

          {hasPinSetup && !showFirstTime && (
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
        <div className="flex items-center gap-2.5 p-3 bg-[var(--surface)] rounded-lg">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <div className="flex-1">
            <p className="text-[var(--text-primary)] text-xs font-medium">Encrypted on this device</p>
            <p className="text-[var(--text-muted)] text-[11px]">Your data never leaves unencrypted</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 nemo-divider-bottom">
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-muted)] text-xs">Can't access vault?</span>
          <button
            onClick={() => setShowRecovery(true)}
            disabled={loading !== null}
            className="text-[var(--accent)] hover:opacity-80 text-xs font-medium transition-opacity"
          >
            Use recovery phrase
          </button>
        </div>
      </div>
    </div>
  )
}
