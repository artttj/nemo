

import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Lock, RefreshCw, Check, Copy, AlertTriangle, Fingerprint } from 'lucide-react'
import { useBiometricType, getBiometricName } from '~/utils/biometric'

interface VaultSetupProps {
  onBack: () => void
  onCreate: (recoveryPhrase: string, enableTouchId: boolean) => Promise<void>
}

export function VaultSetup({ onBack, onCreate }: VaultSetupProps) {
  const [phrase, setPhrase] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [enableTouchId, setEnableTouchId] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const biometricType = useBiometricType()
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    generatePhrase()
  }, [])

  const generatePhrase = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GENERATE_RECOVERY_PHRASE' })
      if (response.success) {
        setPhrase(response.data)
        setConfirmed(false)
        setCopied(false)
      } else {
        setError(response.error || 'Failed to generate master key')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate master key')
    }
  }

  const handleCopy = async () => {
    if (!phrase) return
    try {
      await navigator.clipboard.writeText(phrase)
      setCopied(true)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2500)
    } catch {}
  }

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  const handleCreate = async () => {
    if (!phrase || !confirmed) return
    setCreating(true)
    setError(null)
    try {
      await onCreate(phrase, enableTouchId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vault')
      setCreating(false)
    }
  }

  const words = phrase?.split(' ') ?? []
  const biometricLabel = getBiometricName(biometricType)

  return (
    <div className="w-[400px] min-h-[560px] flex flex-col bg-[var(--void)]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <button
          onClick={onBack}
          disabled={creating}
          className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors text-sm font-medium flex items-center gap-1.5 px-2 py-1 -ml-2 rounded-lg hover:bg-[var(--surface)] disabled:opacity-50"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center nemo-brand-icon">
            <Lock size={13} style={{ color: 'var(--accent-text)' }} />
          </div>
          <span className="font-semibold text-[var(--text-primary)] text-[14px]">Nemo</span>
        </div>
      </div>

      <div className="flex-1 px-5 py-4 flex flex-col overflow-y-auto">
        <div className="mb-3">
          <h1 className="text-[17px] font-bold text-[var(--text-primary)] mb-1">Set up your vault</h1>
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
            Your master key is the only way to recover your passwords if you lose access.
          </p>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold text-[var(--text-primary)] uppercase tracking-wider">Master Key</span>
            <button
              onClick={generatePhrase}
              disabled={creating}
              className="text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} />
              Regenerate
            </button>
          </div>

          {phrase ? (
            <div className="grid grid-cols-3 gap-1.5 p-2.5 bg-[var(--surface)] rounded-xl">
              {words.map((word, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-2 py-1.5 bg-[var(--void-elevated)] rounded-lg border border-[var(--border)]"
                >
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] w-[14px] text-right flex-shrink-0 tabular-nums">
                    {i + 1}
                  </span>
                  <span className="text-[11px] font-semibold text-[var(--text-primary)] tracking-tight" style={{ fontFamily: "'JetBrains Mono', 'Menlo', monospace" }}>
                    {word}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[140px] bg-[var(--surface)] rounded-xl flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-[var(--text-muted)] border-t-transparent animate-spin" />
            </div>
          )}
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={handleCopy}
            disabled={!phrase || creating}
            className={`flex-1 py-2 rounded-lg text-[12px] font-medium transition-all flex items-center justify-center gap-1.5 border disabled:opacity-50 ${
              copied
                ? 'bg-[var(--success-light)] text-[var(--success)] border-[var(--success)]/20'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
            }`}
          >
            {copied ? (
              <>
                <Check size={12} />
                Copied
              </>
            ) : (
              <>
                <Copy size={12} />
                Copy all words
              </>
            )}
          </button>
        </div>

        <div className="flex items-start gap-2.5 px-3 py-2 bg-[var(--danger-bg)] rounded-lg border border-[var(--danger)]/10 mb-4">
          <AlertTriangle size={12} style={{ color: 'var(--danger)' }} className="flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-[var(--danger)] leading-relaxed font-medium">
            Write this down now. If you lose your master key and your biometrics, your vault cannot be recovered.
          </p>
        </div>

        <div className="border-t border-[var(--border)] pt-4 mb-3">
          <div
            className="flex items-center justify-between cursor-pointer group"
            onClick={() => !creating && setEnableTouchId(v => !v)}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--surface)] flex items-center justify-center">
                <Fingerprint size={18} style={{ color: 'var(--text-secondary)' }} />
              </div>
              <div>
                <p className="text-[13px] font-medium text-[var(--text-primary)]">{biometricLabel}</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">Unlock with biometrics</p>
              </div>
            </div>
            <div className={`w-10 h-[22px] rounded-full transition-colors relative ${
              enableTouchId ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'
            }`}>
              <div className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform ${
                enableTouchId ? 'translate-x-[20px]' : 'translate-x-[2px]'
              }`} />
            </div>
          </div>
          {!enableTouchId && (
            <p className="mt-2 ml-12 text-[11px] text-[var(--text-muted)] leading-relaxed">
              You'll enter your master key each time you unlock. You can add biometrics later in settings.
            </p>
          )}
        </div>

        {error && (
          <div className="mb-3 p-3 bg-[var(--danger-bg)] rounded-lg border border-[var(--danger)]/20">
            <p className="text-[var(--danger)] text-[12px] font-medium">{error}</p>
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-[var(--border)] space-y-3">
        <label className="flex items-start gap-3 cursor-pointer select-none group">
          <div
            className="relative mt-px flex-shrink-0"
            onClick={() => !creating && setConfirmed(v => !v)}
          >
            <div className={`w-[18px] h-[18px] rounded-[5px] border-2 flex items-center justify-center transition-colors ${
              confirmed
                ? 'bg-[var(--accent)] border-[var(--accent)]'
                : 'border-[var(--border-strong)] bg-[var(--void-elevated)] group-hover:border-[var(--text-muted)]'
            }`}>
              {confirmed && (
                <Check size={10} style={{ color: 'var(--accent-text)' }} />
              )}
            </div>
          </div>
          <span
            className="text-[13px] text-[var(--text-secondary)] leading-snug pt-px cursor-pointer"
            onClick={() => !creating && setConfirmed(v => !v)}
          >
            I've saved my master key
          </span>
        </label>

        <button
          onClick={handleCreate}
          disabled={!confirmed || !phrase || creating}
          className="w-full nemo-button-primary py-3 text-[14px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {creating
            ? (enableTouchId ? 'Verifying...' : 'Creating...')
            : (enableTouchId ? `Create vault with ${biometricLabel}` : 'Create vault')}
        </button>
      </div>
    </div>
  )
}
