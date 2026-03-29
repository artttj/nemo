

import { useState, useEffect } from 'react'
import { AlertTriangle, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import type { VaultEntry } from '~/utils/types'
import { TOTPSetup } from './totp-setup'
import { TOTPDisplay } from './totp-display'
import { isValidTOTPSecret } from '~/utils/totp'
import type { TOTPConfig } from '~/utils/totp'
import { generatePassword } from '~/utils/crypto'

export function AddEditModal({
  isOpen,
  onClose,
  onSave,
  entry
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>) => void
  entry?: VaultEntry
}) {
  const [title, setTitle] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false)
  const [totpConfig, setTOTPConfig] = useState<TOTPConfig | undefined>(undefined)
  const [showTOTPSetup, setShowTOTPSetup] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (entry) {
        setTitle(entry.title || '')
        setUsername(entry.username || '')
        setPassword(entry.password || '')
        setUrl(entry.url || '')
        setNotes(entry.notes || '')
        setTOTPConfig(entry.totp)
      } else {
        setTitle('')
        setUsername('')
        setPassword('')
        setUrl('')
        setNotes('')
        setTOTPConfig(undefined)
      }
      setShowPassword(false)
      setShowGenerateConfirm(false)
      setShowTOTPSetup(false)
    }
  }, [isOpen, entry])

  const handleSave = () => {
    if (!title.trim()) return

    const data: any = {
      title: title.trim()
    }

    if (username.trim()) data.username = username.trim()
    if (password) data.password = password
    if (url.trim()) data.url = url.trim()
    if (notes.trim()) data.notes = notes.trim()
    if (totpConfig) data.totp = totpConfig

    onSave(data)
    onClose()
  }

  const handleGeneratePassword = () => {
    const newPassword = generatePassword({ length: 20 })
    setPassword(newPassword)
    setShowPassword(true)
    setShowGenerateConfirm(false)
  }

  const handleGenerateClick = () => {
    if (entry && password) {
      setShowGenerateConfirm(true)
    } else {
      handleGeneratePassword()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      
      {showGenerateConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowGenerateConfirm(false)} />
          <div className="relative bg-[var(--void)] rounded-xl p-5 max-w-sm w-full border border-[var(--border)]">
            <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[var(--danger-bg)] flex items-center justify-center">
              <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] text-center mb-1">Replace password?</h3>
            <p className="text-[var(--text-secondary)] text-sm text-center mb-4">
              This will overwrite your existing password.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowGenerateConfirm(false)}
                className="flex-1 py-2 px-3 border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--surface)] transition-colors"
              >
                Keep existing
              </button>
              <button
                onClick={handleGeneratePassword}
                className="flex-1 py-2 px-3 bg-[var(--danger)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div
        className="absolute right-0 top-0 h-full w-[380px] bg-[var(--void)] flex flex-col nemo-slide-panel"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 rounded-md hover:bg-[var(--surface)]"
            >
              <ArrowLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-[var(--text-primary)]">{entry ? 'Edit' : 'Add password'}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Google Account"
                autoFocus
                className="w-full nemo-input px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="user@example.com"
                className="w-full nemo-input px-3 py-2 text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">Password</label>
                <button
                  type="button"
                  onClick={handleGenerateClick}
                  className="text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Generate
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full nemo-input px-3 py-2 pr-10 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Website</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full nemo-input px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional information..."
                rows={4}
                className="w-full nemo-input px-3 py-2 text-sm resize-y min-h-[100px]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">Two-factor authentication</label>
                {!showTOTPSetup && (
                  <button
                    type="button"
                    onClick={() => setShowTOTPSetup(true)}
                    className="text-[11px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                  >
                    {totpConfig ? 'Edit' : 'Add'}
                  </button>
                )}
              </div>
              {showTOTPSetup ? (
                <TOTPSetup
                  existingConfig={totpConfig}
                  onSave={(config) => {
                    setTOTPConfig(config)
                    setShowTOTPSetup(false)
                  }}
                  onCancel={() => {
                    setTOTPConfig(undefined)
                    setShowTOTPSetup(false)
                  }}
                />
              ) : totpConfig ? (
                <div className="p-3 bg-[var(--surface)] rounded-lg">
                  <TOTPDisplay config={totpConfig} compact />
                </div>
              ) : (
                <div
                  onClick={() => setShowTOTPSetup(true)}
                  className="p-3 border border-dashed border-[var(--border)] rounded-lg cursor-pointer hover:border-[var(--accent)] transition-colors text-center"
                >
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Click to set up 2FA
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border)]">
          <button 
            onClick={handleSave}
            disabled={!title.trim()}
            className="w-full py-2.5 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg font-medium text-sm hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {entry ? 'Save changes' : 'Add password'}
          </button>
        </div>
      </div>
    </div>
  )
}
