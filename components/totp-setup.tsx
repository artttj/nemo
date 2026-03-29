

import { useState, useCallback } from 'react'
import { parseTOTPUri, isValidTOTPSecret, formatTOTPSecret, type TOTPConfig } from '~/utils/totp'

interface TOTPSetupProps {
  onSave: (config: TOTPConfig) => void
  onCancel: () => void
  existingConfig?: TOTPConfig
}

const MIN_SECRET_CHARS = 16
const SECRET_DISPLAY_GROUP_SIZE = 4

export function TOTPSetup({ onSave, onCancel, existingConfig }: TOTPSetupProps) {
  const [mode, setMode] = useState<'scan' | 'manual'>('scan')
  const [secret, setSecret] = useState(existingConfig?.secret || '')
  const [uri, setUri] = useState('')
  const [error, setError] = useState('')
  const [parsed, setParsed] = useState<TOTPConfig | null>(existingConfig || null)

  const handleUriChange = useCallback((value: string) => {
    setUri(value)
    setError('')

    if (!value.trim()) {
      setParsed(null)
      return
    }

    const config = parseTOTPUri(value.trim())
    if (config) {
      setParsed(config)
      setSecret(config.secret)
    } else {
      setParsed(null)
      setError('Invalid QR code URI')
    }
  }, [])

  const handleSecretChange = useCallback((value: string) => {
    const sanitized = value.toUpperCase().replace(/[^A-Z2-7]/g, '')
    setSecret(sanitized)
    setError('')

    if (!sanitized.trim()) {
      setParsed(null)
      return
    }

    if (isValidTOTPSecret(sanitized)) {
      setParsed({
        secret: sanitized,
        digits: 6,
        period: 30
      })
    } else {
      setParsed(null)
    }
  }, [])

  const handleSave = () => {
    if (!parsed) {
      setError(`Please enter a valid 2FA secret (${MIN_SECRET_CHARS}+ characters, A-Z and 2-7)`)
      return
    }
    onSave(parsed)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 p-1 bg-[var(--surface)] rounded-lg">
        <button
          onClick={() => setMode('scan')}
          className={`flex-1 py-1.5 px-3 text-xs font-medium rounded transition-colors ${
            mode === 'scan'
              ? 'bg-[var(--accent)] text-[var(--accent-text)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Scan QR
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex-1 py-1.5 px-3 text-xs font-medium rounded transition-colors ${
            mode === 'manual'
              ? 'bg-[var(--accent)] text-[var(--accent-text)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Manual
        </button>
      </div>

      {mode === 'scan' ? (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-[var(--text-secondary)]">
            Paste QR code URI
          </label>
          <textarea
            value={uri}
            onChange={(e) => handleUriChange(e.target.value)}
            placeholder="otpauth://totp/..."
            rows={3}
            className="w-full nemo-input px-3 py-2 text-sm resize-none font-mono"
          />
          <p className="text-xs text-[var(--text-tertiary)]">
            Tip: Most sites show a QR code. Look for "Can't scan?" or "Manual entry" to get the URI.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-[var(--text-secondary)]">
            Secret key
          </label>
          <textarea
            value={formatTOTPSecret(secret)}
            onChange={(e) => handleSecretChange(e.target.value)}
            placeholder="Enter the secret key..."
            rows={2}
            className="w-full nemo-input px-3 py-2 text-sm resize-none font-mono"
          />
          <p className="text-xs text-[var(--text-tertiary)]">
            The secret is usually 16-32 characters. Spaces are ignored.
          </p>
        </div>
      )}

      {error && (
        <div className="p-2 bg-[var(--danger-bg)] rounded border border-[var(--danger)] border-opacity-20">
          <p className="text-xs text-[var(--danger)]">{error}</p>
        </div>
      )}

      {parsed && (
        <div className="p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
          <p className="text-xs text-[var(--text-secondary)] mb-1">Preview</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--success)]"></div>
            <p className="text-sm text-[var(--text-primary)]">
              {parsed.issuer && <span className="font-medium">{parsed.issuer}</span>}
              {parsed.accountName && <span className="text-[var(--text-tertiary)]"> ({parsed.accountName})</span>}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 px-3 border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--surface)] transition-colors"
        >
          {existingConfig ? 'Remove' : 'Cancel'}
        </button>
        <button
          onClick={handleSave}
          disabled={!parsed}
          className="flex-1 py-2 px-3 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg font-medium text-sm hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {existingConfig ? 'Update' : 'Add 2FA'}
        </button>
      </div>
    </div>
  )
}
