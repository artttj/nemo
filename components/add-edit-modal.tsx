/**
 * Copyright 2024-2025 Artem Iagovdik <artyom.yagovdik@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react'
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
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
