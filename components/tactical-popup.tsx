

import { useState, useEffect, useRef } from "react"

interface VaultEntry {
  id: string
  title: string
  username?: string
  password?: string
  url?: string
  favicon?: string
}

interface TacticalPopupProps {
  isLocked: boolean
  entries?: VaultEntry[]
  onUnlock: () => void
  onLock: () => void
  onCopy: (text: string) => void
  onAddEntry: () => void
  onSearch: (query: string) => void
  onSelectEntry: (entry: VaultEntry) => void
}

export default function TacticalPopup({
  isLocked,
  entries = [],
  onUnlock,
  onLock,
  onCopy,
  onAddEntry,
  onSearch,
  onSelectEntry
}: TacticalPopupProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredEntries = entries.filter(entry =>
    entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    if (!isLocked) {
      inputRef.current?.focus()
    }
  }, [isLocked])

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setNotification({ type: "success", message: "COPIED" })
      onCopy(text)
      setTimeout(() => setNotification(null), 2000)
    } catch {
      setNotification({ type: "error", message: "COPY FAILED" })
      setTimeout(() => setNotification(null), 2000)
    }
  }

  const togglePasswordVisibility = (entryId: string) => {
    setShowPassword(prev => ({ ...prev, [entryId]: !prev[entryId] }))
  }

  const handleUnlock = async () => {
    setIsLoading(true)
    await onUnlock()
    setIsLoading(false)
  }

  if (isLocked) {
    return (
      <div className="nemo-popup">
        <div className="scanline-overlay" />

        <div className="flex flex-col h-full">
          <div className="hud-header">
            <span className="hud-title text-success text-neon">NEMO</span>
            <div className="status-indicator locked pulse" />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="hud-card chamfered p-8 w-full max-w-xs mb-6">
              <div className="scan-line" />
              <div className="text-center">
                <div className="mb-6">
                  <svg className="w-16 h-16 mx-auto text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="hud-title text-sm text-secondary mb-6 cursor-blink">VAULT LOCKED</h2>
                <p className="text-xs text-muted mb-6">AUTHENTICATE TO ACCESS</p>
              </div>
            </div>

            <button
              onClick={handleUnlock}
              disabled={isLoading}
              className="tactical-button tactical-button-primary chamfered w-full max-w-xs mb-3"
            >
              {isLoading ? <span className="loading-dots" /> : "UNLOCK WITH PASSKEY"}
            </button>

            <button
              onClick={() => alert("Recovery phrase feature coming soon")}
              className="tactical-button chamfered w-full max-w-xs text-xs"
            >
              RECOVER WITH PHRASE
            </button>
          </div>

          <div className="px-4 py-3 border-t border-subtle">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>V1.0.0</span>
              <span>ENCRYPTED: AES-256-GCM</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="nemo-popup">
      <div className="scanline-overlay" />

      <div className="flex flex-col h-full">
        <div className="hud-header">
          <span className="hud-title text-success text-neon">NEMO</span>
          <div className="flex items-center gap-3">
            <div className="status-indicator unlocked pulse" />
            <button
              onClick={onLock}
              className="text-muted hover:text-destructive transition-colors"
              title="Lock Vault"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-subtle">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value)
                onSearch(e.target.value)
              }}
              placeholder="SEARCH_VAULT_"
              className="tactical-input chamfered-sm pr-10"
            />
            <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-tactical">
          <div className="p-3 space-y-2">
            {filteredEntries.length === 0 ? (
              <div className="hud-card chamfered p-6 text-center">
                <div className="scan-line" />
                <p className="text-sm text-muted mb-2">NO RESULTS</p>
                <p className="text-xs text-secondary">CLEAR SEARCH OR ADD ENTRY</p>
              </div>
            ) : (
              filteredEntries.map(entry => (
                <div
                  key={entry.id}
                  onClick={() => onSelectEntry(entry)}
                  className="hud-card chamfered-sm entry-card"
                >
                  <div className="flex items-start gap-3">
                    {entry.favicon ? (
                      <img src={entry.favicon} alt="" className="w-5 h-5 flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 bg-elevated border border-subtle flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium truncate text-primary">{entry.title}</h3>
                      {entry.username && (
                        <p className="text-xs text-muted truncate">{entry.username}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {entry.password && (
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            handleCopy(entry.password!)
                          }}
                          className="p-1.5 text-muted hover:text-success transition-colors"
                          title="Copy Password"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      )}
                      {entry.username && (
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            handleCopy(entry.username!)
                          }}
                          className="p-1.5 text-muted hover:text-secondary transition-colors"
                          title="Copy Username"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-subtle">
          <button
            onClick={onAddEntry}
            className="tactical-button chamfered w-full flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            ADD ENTRY
          </button>
        </div>

        {notification && (
          <div className={`absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 chamfered-sm ${
            notification.type === "success" ? "bg-elevated border-success" : "bg-elevated border-destructive"
          }`}>
            <span className={`text-xs ${notification.type === "success" ? "text-success" : "text-destructive"}`}>
              {notification.message}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
