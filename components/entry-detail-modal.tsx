

import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, ArrowLeft, Check, Copy, ExternalLink, Eye, EyeOff, FileKey, History, MoreVertical, Trash2, User, X } from 'lucide-react'
import type { VaultEntry, EntryHistory } from '~/utils/types'
import { getFaviconUrl } from '~/utils/vault'
import { getDomain } from '~/utils/url'
import { TOTPDisplay } from './totp-display'

interface EntryDetailModalProps {
  entry: VaultEntry | null
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onRestore?: (entryId: string, version: number) => Promise<void>
  sitePreferences?: { autoFillMode: 'always' | 'never' | 'ask' } | null
  onSaveSitePreferences?: (hostname: string, preferences: { autoFillMode: 'always' | 'never' | 'ask'; preferredEntryId?: string }) => Promise<void>
}

export function EntryDetailModal({ entry, isOpen, onClose, onEdit, onDelete, onRestore, sitePreferences, onSaveSitePreferences }: EntryDetailModalProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details')
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<EntryHistory | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setShowPassword(false)
    setCopied(null)
    setShowMenu(false)
    setShowDeleteConfirm(false)
    setActiveTab('details')
    setShowRestoreConfirm(null)
    setRestoring(false)
  }, [entry?.id])

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  if (!isOpen || !entry) return null

  const favicon = getFaviconUrl(entry.url, 64)
  const domain = getDomain(entry.url)

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(field)
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    copyTimeoutRef.current = setTimeout(() => setCopied(null), 2000)
  }

  const handleDelete = () => {
    setShowDeleteConfirm(false)
    setShowMenu(false)
    onDelete()
  }

  const handleRestore = async () => {
    if (!showRestoreConfirm || !entry || !onRestore) return
    setRestoring(true)
    await onRestore(entry.id, showRestoreConfirm.version)
    setRestoring(false)
    setShowRestoreConfirm(null)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className={`fixed inset-0 z-50 transition-opacity duration-200 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-[var(--void)] rounded-xl p-5 max-w-sm w-full border border-[var(--border)] shadow-xl">
            <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[var(--danger-bg)] flex items-center justify-center">
              <Trash2 size={20} style={{ color: 'var(--danger)' }} />
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] text-center mb-1">Delete this password?</h3>
            <p className="text-[var(--text-secondary)] text-sm text-center mb-4">
              This cannot be undone. "{entry.title}" will be permanently deleted.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 px-3 border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--surface)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 px-3 bg-[var(--danger)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showRestoreConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowRestoreConfirm(null)} />
          <div className="relative bg-[var(--void)] rounded-xl p-5 max-w-sm w-full border border-[var(--border)] shadow-xl">
            <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[var(--accent-bg)] flex items-center justify-center">
              <History size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] text-center mb-1">Restore this version?</h3>
            <p className="text-[var(--text-secondary)] text-sm text-center mb-4">
              This will replace the current entry with the version from {formatDate(showRestoreConfirm.changedAt)}. The current state will be saved to history.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRestoreConfirm(null)}
                className="flex-1 py-2 px-3 border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--surface)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="flex-1 py-2 px-3 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
              >
                {restoring ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className={`absolute right-0 top-0 h-full w-[380px] bg-[var(--void)] flex flex-col nemo-slide-panel transition-transform duration-200 ease-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm font-medium"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="flex items-center gap-1 bg-[var(--surface)] rounded-lg p-1">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'details'
                  ? 'bg-[var(--void-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-[var(--void-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              History {entry?.history && entry.history.length > 0 && `(${entry.history.length})`}
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] rounded-md transition-colors"
            >
              <MoreVertical size={18} />
            </button>
            
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-36 bg-[var(--void-elevated)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden z-20">
                  <button
                    onClick={() => { setShowMenu(false); onEdit(); }}
                    className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface)] flex items-center gap-2"
                  >
                    <FileKey size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }}
                    className="w-full px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--danger-bg)] flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'details' ? (
            <>
            <div className="px-4 py-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-[var(--surface)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                {favicon ? (
                  <img
                    src={favicon}
                    alt=""
                    className="w-7 h-7"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                      ;(e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                ) : null}
                <span className={`text-lg font-semibold text-[var(--text-secondary)] ${favicon ? 'hidden' : ''}`}>
                  {entry.title.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-semibold text-[var(--text-primary)] truncate">{entry.title}</h1>
                {domain && (
                  <p className="text-xs text-[var(--text-tertiary)] truncate">{domain}</p>
                )}
              </div>
            </div>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {entry.username && (
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5 font-medium">Username</p>
                    <p className="text-[13px] text-[var(--text-primary)] truncate">{entry.username}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(entry.username!, 'username')}
                    className="ml-2 p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] rounded-md transition-colors flex-shrink-0"
                    title="Copy username"
                  >
                    {copied === 'username' ? (
                      <Check size={16} style={{ color: 'var(--success)' }} />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
              </div>
            )}

            {entry.password && (
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5 font-medium">Password</p>
                    <p className="text-[13px] text-[var(--text-primary)] truncate font-mono">
                      {showPassword ? entry.password : '•'.repeat(Math.min(entry.password.length, 20))}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] rounded-md transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      onClick={() => handleCopy(entry.password!, 'password')}
                      className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] rounded-md transition-colors"
                      title="Copy password"
                    >
                      {copied === 'password' ? (
                        <Check size={16} style={{ color: 'var(--success)' }} />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {entry.url && (
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5 font-medium">Website</p>
                    <a 
                      href={entry.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--text-primary)] hover:underline truncate block"
                    >
                      {entry.url}
                    </a>
                  </div>
                  <a 
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] rounded-md transition-colors flex-shrink-0"
                    title="Open website"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            )}

            {entry.totp && (
              <div className="px-4 py-3">
                <TOTPDisplay
                  config={entry.totp}
                  onCopy={(code) => handleCopy(code, 'totp')}
                  autoCopy
                />
              </div>
            )}

            {entry.notes && (
              <div className="px-4 py-3">
                <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-1 font-medium">Notes</p>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap break-words">{entry.notes}</p>
              </div>
            )}

            {entry.url && onSaveSitePreferences && (
              <div className="px-4 py-3 border-t border-[var(--border)]">
                <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-2 font-medium">Site Preferences</p>
                <div className="space-y-2">
                  <select
                    value={sitePreferences?.autoFillMode ?? 'ask'}
                    onChange={async (e) => {
                      const mode = e.target.value as 'always' | 'never' | 'ask'
                      setSavingPrefs(true)
                      await onSaveSitePreferences(getDomain(entry.url!) || entry.url!, {
                        autoFillMode: mode,
                        preferredEntryId: mode === 'always' ? entry.id : undefined
                      })
                      setSavingPrefs(false)
                    }}
                    disabled={savingPrefs}
                    className="w-full nemo-input px-3 py-2 text-sm"
                  >
                    <option value="ask">Ask before filling</option>
                    <option value="always">Always fill with this entry</option>
                    <option value="never">Never fill on this site</option>
                  </select>
                  {savingPrefs && (
                    <p className="text-xs text-[var(--text-muted)]">Saving...</p>
                  )}
                </div>
              </div>
            )}
          </div>
          </>
        ) : (
          <div className="px-4 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--surface)] flex items-center justify-center flex-shrink-0">
                <History size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-[var(--text-primary)]">Version History</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {entry?.history?.length
                    ? `Last ${entry.history.length} saved versions`
                    : 'No history yet. Edit this entry to save versions.'}
                </p>
              </div>
            </div>

            {entry?.history?.length ? (
              <div className="space-y-2">
                {entry.history.map((version, index) => (
                  <div
                    key={version.version}
                    className="p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[var(--text-primary)]">
                        Version {entry.history!.length - index}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {formatDate(version.changedAt)}
                      </span>
                    </div>

                    {(version.data.username || version.data.password) && (
                      <div className="text-xs text-[var(--text-secondary)] mb-2">
                        {version.data.username && (
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--text-muted)]">Username:</span>
                            <span className="font-mono truncate">{version.data.username}</span>
                          </div>
                        )}
                        {version.data.password && (
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--text-muted)]">Password:</span>
                            <span className="font-mono">••••••••</span>
                          </div>
                        )}
                      </div>
                    )}

                    {version.data.notes && (
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-2">
                        {version.data.notes}
                      </p>
                    )}

                    <button
                      onClick={() => setShowRestoreConfirm(version)}
                      className="w-full py-1.5 px-2 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-bg)] rounded transition-colors"
                    >
                      Restore this version
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--surface)] flex items-center justify-center">
                  <History size={24} style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-1">No history yet</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Each time you edit this entry, a version is saved here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
  )
}
