import { useState, useEffect, useRef } from 'react'
import type { VaultEntry } from '~/utils/types'
import { getFaviconUrl } from '~/utils/vault'
import { getDomain } from '~/utils/url'

interface EntryDetailModalProps {
  entry: VaultEntry | null
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export function EntryDetailModal({ entry, isOpen, onClose, onEdit, onDelete }: EntryDetailModalProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setShowPassword(false)
    setCopied(null)
    setShowMenu(false)
    setShowDeleteConfirm(false)
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
    copyTimeoutRef.current = setTimeout(() => setCopied(null), 2000)
  }

  const handleDelete = () => {
    setShowDeleteConfirm(false)
    setShowMenu(false)
    onDelete()
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
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
      
      <div className={`absolute right-0 top-0 h-full w-[380px] bg-[var(--void)] flex flex-col nemo-slide-panel transition-transform duration-200 ease-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] rounded-md transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>
            
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-36 bg-[var(--void-elevated)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden z-20">
                  <button
                    onClick={() => { setShowMenu(false); onEdit(); }}
                    className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface)] flex items-center gap-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }}
                    className="w-full px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--danger-bg)] flex items-center gap-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
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
                    <p className="text-[13px] text-[var(--text-primary)] truncate font-mono">{entry.username}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(entry.username!, 'username')}
                    className="ml-2 p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] rounded-md transition-colors flex-shrink-0"
                    title="Copy username"
                  >
                    {copied === 'username' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
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
                    <button
                      onClick={() => handleCopy(entry.password!, 'password')}
                      className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] rounded-md transition-colors"
                      title="Copy password"
                    >
                      {copied === 'password' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                    </svg>
                  </a>
                </div>
              </div>
            )}

            {entry.notes && (
              <div className="px-4 py-3">
                <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-1 font-medium">Notes</p>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap break-words">{entry.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
