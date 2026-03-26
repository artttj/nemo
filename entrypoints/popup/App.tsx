import { useState, useEffect, useRef } from 'react'
import type { VaultEntry } from '~/utils/types'

type FilterType = 'all' | 'favorite' | 'recent'

interface AppProps {}

type VaultState = {
  isUnlocked: boolean
  vault: { entries: VaultEntry[]; settings: { autoLockMinutes: number; theme: 'light' | 'dark' | 'system' } } | null
  metadata: { version: string; vaultId: string; createdAt: number; updatedAt: number; deviceId: string; salt: string; kdf: string } | null
  lastActivity: number
}

export default function App() {
  const [state, setState] = useState<VaultState>({
    isUnlocked: false,
    vault: null,
    metadata: null,
    lastActivity: Date.now()
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadStateWithRetry()
  }, [])

  useEffect(() => {
    if (!state.isUnlocked) return
    inputRef.current?.focus()
  }, [state.isUnlocked])

  const loadStateWithRetry = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_VAULT_STATE' })
        if (response.success) {
          setState(response.data)
          break
        }
      } catch (error: any) {
        if (error.message?.includes('Receiving end does not exist')) {
          console.log('Background not ready, retrying...')
          if (i === retries - 1) {
            setError('Extension starting up. Please wait.')
          } else {
            await new Promise((r) => setTimeout(r, 500))
            continue
          }
        } else {
          setError(String(error))
          console.error('Failed to load state:', error)
        }
      } finally {
        setLoading(false)
      }
    }
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 2000)
  }

  const handleUnlock = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'UNLOCK_VAULT' })
      if (response.success) {
        setState((prev: any) => ({ ...prev, isUnlocked: true, vault: response.data }))
      } else {
        throw new Error(response.error || 'Failed to unlock vault')
      }
    } catch (error: any) {
      if (error.message?.includes('Receiving end does not exist')) {
        setError('Extension starting up. Please wait.')
      } else {
        setError(String(error))
        console.error('Unlock error:', error)
      }
    }
  }

  const handleCreate = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CREATE_VAULT' })
      if (response.success) {
        setState((prev: any) => ({
          ...prev,
          isUnlocked: true,
          metadata: response.data,
          vault: { entries: [], settings: { autoLockMinutes: 5, theme: 'dark' } }
        }))
      } else {
        throw new Error(response.error || 'Failed to create vault')
      }
    } catch (error: any) {
      if (error.message?.includes('Receiving end does not exist')) {
        setError('Extension starting up. Please wait.')
      } else {
        setError(String(error))
        console.error('Create error:', error)
      }
    }
  }

  const handleLock = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'LOCK_VAULT' })
      setState({
        isUnlocked: false,
        vault: null,
        metadata: null,
        lastActivity: Date.now()
      })
    } catch (error: any) {
      if (error.message?.includes('Receiving end does not exist')) {
        setError('Extension starting up. Please wait.')
      } else {
        setError(String(error))
        console.error('Lock error:', error)
      }
    }
  }

  const handleAddEntry = async (entry: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ADD_ENTRY',
        payload: entry
      })
      if (response.success) {
        setState((prev: any) => ({
          ...prev,
          vault: prev.vault
            ? { ...prev.vault, entries: [...prev.vault.entries, response.data] }
            : null
        }))
        showNotification('success', 'Entry added')
      }
      setShowAddModal(false)
    } catch (error: any) {
      if (error.message?.includes('Receiving end does not exist')) {
        setError('Extension starting up. Please wait.')
      } else {
        setError(String(error))
        console.error('Add entry error:', error)
      }
    }
  }

  const handleEditEntry = async (updates: Partial<VaultEntry>) => {
    if (!editingEntry) return
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_ENTRY',
        payload: { id: editingEntry.id, updates }
      })
      if (response.success) {
        setState((prev: any) => ({
          ...prev,
          vault: prev.vault
            ? {
                ...prev.vault,
                entries: prev.vault.entries.map((e: any) =>
                  e.id === editingEntry.id ? response.data : e
                )
              }
            : null
        }))
        showNotification('success', 'Entry updated')
      }
      setEditingEntry(null)
    } catch (error: any) {
      if (error.message?.includes('Receiving end does not exist')) {
        setError('Extension starting up. Please wait.')
      } else {
        setError(String(error))
        console.error('Edit entry error:', error)
      }
    }
  }

  const handleDeleteEntry = async (id: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_ENTRY',
        payload: id
      })
      if (response.success) {
        setState((prev: any) => ({
          ...prev,
          vault: prev.vault
            ? { ...prev.vault, entries: prev.vault.entries.filter((e: any) => e.id !== id) }
            : null
        }))
        showNotification('success', 'Entry deleted')
      }
    } catch (error: any) {
      if (error.message?.includes('Receiving end does not exist')) {
        setError('Extension starting up. Please wait.')
      } else {
        setError(String(error))
        console.error('Delete entry error:', error)
      }
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (!query) return
    try {
      await chrome.runtime.sendMessage({
        type: 'SEARCH_ENTRIES',
        payload: query
      })
    } catch (error) {
      console.error('Search error:', error)
    }
  }

  const handleExport = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'EXPORT_VAULT' })
      if (response.success) {
        const blob = new Blob([response.data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `nemo-vault-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
        showNotification('success', 'Vault exported')
      }
    } catch (error: any) {
      setError(String(error))
      console.error('Export error:', error)
    }
  }

  const handleImport = async (data: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'IMPORT_VAULT',
        payload: data
      })
      if (response.success) {
        setState((prev: any) => ({
          ...prev,
          vault: response.data
        }))
        showNotification('success', 'Vault imported')
      } else {
        throw new Error(response.error || 'Failed to import vault')
      }
    } catch (error: any) {
      setError(String(error))
      console.error('Import error:', error)
    }
  }

  const handleSettingsChange = async (settings: Partial<{ autoLockMinutes: number; theme: 'light' | 'dark' | 'system' }>) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        payload: settings
      })
      if (response.success) {
        setState((prev: any) => ({
          ...prev,
          vault: prev.vault
            ? { ...prev.vault, settings: { ...prev.vault.settings, ...settings } }
            : null
        }))
      }
    } catch (error: any) {
      setError(String(error))
      console.error('Settings error:', error)
    }
  }

  const allEntries = state.vault?.entries ?? []
  const now = Date.now()
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000

  const filteredEntries = allEntries
    .filter((entry: any) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          entry.title.toLowerCase().includes(query) ||
          (entry.username?.toLowerCase().includes(query) ?? false) ||
          (entry.url?.toLowerCase().includes(query) ?? false) ||
          (entry.tags?.some((t: string) => t.toLowerCase().includes(query)) ?? false) ||
          (entry.notes?.toLowerCase().includes(query) ?? false)
        if (!matchesSearch) return false
      }

      switch (activeFilter) {
        case 'favorite':
          return entry.favorite === true
        case 'recent':
          return entry.updatedAt > oneWeekAgo
        default:
          return true
      }
    })
    .sort((a: any, b: any) => {
      if (a.favorite && !b.favorite) return -1
      if (!a.favorite && b.favorite) return 1
      return b.updatedAt - a.updatedAt
    })

  const filterCounts = {
    all: allEntries.length,
    favorite: allEntries.filter((e: any) => e.favorite).length,
    recent: allEntries.filter((e: any) => e.updatedAt > oneWeekAgo).length
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'favorite', label: 'Starred' },
    { key: 'recent', label: 'Recent' }
  ]

  if (loading) {
    return (
      <div className="w-[380px] h-[580px] flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-primary border-t-0 border-b-0 border-l-0 animate-spin"></div>
          <span className="text-fg-muted">Nemo</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-[380px] max-h-[600px] bg-surface p-6">
        <div className="border border-destructive rounded-xl p-5">
          <h3 className="text-fg-primary mb-2">Something went wrong</h3>
          <p className="text-sm text-fg-secondary">{error}</p>
        </div>
      </div>
    )
  }

  if (!state.isUnlocked) {
    return (
      <div className="w-[380px] bg-surface flex flex-col">
        <div className="h-full flex flex-col items-center justify-center p-8">
          <div className="text-center max-w-xs">
            <svg className="w-16 h-16 mx-auto mb-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 11-8 0v4h8z" />
            </svg>
            <h2 className="text-xl font-bold text-fg-primary mb-2">Vault Locked</h2>
            <p className="text-sm text-fg-secondary mb-6">Authenticate to access your passwords</p>
            <button
              onClick={handleUnlock}
              className="w-full bg-primary text-surface py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Unlock with Passkey
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-[380px] h-[580px] bg-surface flex flex-col">
      <div className="flex flex-col h-full">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1.5C5.067 1.5 3.5 3.067 3.5 5V6H3C2.448 6 2.448 6.552 2 6.552 13H11C11.552 13 12 12.552 12 12V7C12 6.448 11.552 6 11 6H10.5V5C10.5 3.067 8.933 1.5 7 1.5ZM5 5C5 3.895 5.895 3.7 3.7C8.105 3.9 3.895 9.5V6H5V5Z" fill="#7c6aef" />
                </svg>
              </div>
              <h1 className="text-lg font-bold text-fg-primary">Nemo</h1>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings(true)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-fg-muted hover:text-fg-secondary transition-colors"
                title="Settings"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6.5 1.5L6.2 3.1C5.8 3.5 4.3 5.1 3.8L3.5 3.2L2.5 8L3.3 6.9C3.3 7.1 3.3 7.3 3.8L3.5 11.8L5.1 11.2C5.4 11.7 10.6 11.7 10.9 11.2L12.5 11.8L14.9 8.1C15.7 7.9 15.7 7.3 15.3 8.1L14.5 13.5H9.5L9.8 11.9C10.2 11.7 10.6 11.5 10.9 11.2L12.5 11.8L14.5 8.1C15.7 7.9 15.7 7.3 15.3 8.1L9.5 1.5H6.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  <circle cx="8" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </button>
              <button
                onClick={handleLock}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-fg-muted hover:text-destructive transition-colors"
                title="Lock vault"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M5 7V5C5 3.343 6.343 2 8 2C9.657 2 11 3.343 11 5V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <circle cx="8" cy="10.5" r="1" fill="currentColor" />
                </svg>
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value)
                handleSearch(e.target.value)
              }}
              placeholder="Search passwords..."
              className="w-full bg-elevated border border-border rounded-lg px-4 py-2 text-sm text-fg-primary outline-none focus:border-primary"
            />
            <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeFilter === f.key
                    ? 'bg-primary text-surface'
                    : 'text-fg-muted hover:text-fg-secondary'
                }`}
              >
                {f.label}
                <span className={`text-xs font-medium ${
                  activeFilter === f.key ? 'text-surface/60' : 'text-fg-faint'
                }`}>
                  {String(filterCounts[f.key as keyof typeof filterCounts]).padStart(2, '0')}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2 pb-4">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-10 h-10 mx-auto mb-3 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm text-fg-secondary mb-2">No results found</p>
                <p className="text-xs text-fg-muted">Clear search or add a new entry</p>
              </div>
            ) : (
              filteredEntries.map((entry: any) => (
                <div
                  key={entry.id}
                  onClick={() => { setEditingEntry(entry); setShowAddModal(true) }}
                  className="group flex items-center gap-3 p-3 mb-2 bg-elevated border border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
                >
                  {entry.url ? (
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${new URL(entry.url).hostname}&sz=32`}
                      alt=""
                      className="w-8 h-8 flex-shrink-0 rounded"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-surface border border-border rounded flex-shrink-0 flex items-center justify-center text-xs text-fg-muted font-medium">
                      {entry.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-fg-primary truncate">{entry.title}</h3>
                    {entry.username && (
                      <p className="text-xs text-fg-muted truncate">{entry.username}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        navigator.clipboard.writeText(entry.password || '')
                        showNotification('success', 'Password copied')
                      }}
                      className="p-1.5 text-fg-muted hover:text-primary transition-colors"
                      title="Copy password"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        navigator.clipboard.writeText(entry.username || '')
                        showNotification('success', 'Username copied')
                      }}
                      className="p-1.5 text-fg-muted hover:text-fg-secondary transition-colors"
                      title="Copy username"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7 7z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full bg-primary text-surface py-3 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
            Add Entry
          </button>
        </div>

        {notification && (
          <div className={`absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg ${
            notification.type === 'success' ? 'bg-success text-surface' : 'bg-destructive text-surface'
          }`}>
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        )}
      </div>

      <AddEditModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingEntry(null) }}
        onSave={editingEntry ? handleEditEntry : handleAddEntry}
        entry={editingEntry ?? undefined}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={state.vault?.settings ?? null}
        onExport={handleExport}
        onImport={handleImport}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  )
}
