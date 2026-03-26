import { useState, useEffect, useRef } from 'react'
import type { VaultEntry } from '~/utils/types'
import '~/style.css'

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
          <span className="text-[14px] text-fg-muted">Nemo</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-[380px] max-h-[600px] bg-surface p-6">
        <div className="bg-destructive/6 border border-destructive/12 rounded-xl p-5">
          <h3 className="text-[15px] font-semibold text-fg-primary mb-2">Something went wrong</h3>
          <p className="text-[13px] text-fg-secondary leading-relaxed">{error}</p>
          <button
            onClick={() => { setError(null); loadStateWithRetry() }}
            className="mt-4 w-full"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!state.isUnlocked) {
    return (
      <div className="w-[380px] bg-surface">
        <LockedView onUnlock={handleUnlock} onCreate={handleCreate} />
      </div>
    )
  }

  return (
    <div className="w-[380px] h-[580px] bg-surface flex flex-col">
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-primary/15 border border-primary/20 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5C5.067 1.5 3.5 3.067 3.5 3.5V6H3C2.448 6 2.448 6.448 2 7V12C2 12.552 2.448 13 3 13H11C11.552 13 12 12.552 12 12V7C12 6.448 11.552 6 11 6H10.5V5C10.5 3.067 8.933 1.5 7 1.5ZM5 5C5 3.895 5.895 3.5 3.067 3.5 5V6H3C2 448 6 2.448 6.448 2 7V12C2 12.552 2.448 13 3 13H11C11.552 13 12 12.552 12 12V7C12 6.448 11.552 6 11 6H10.5V5C10.5 3.067 8.933 1.5 7 1.5Z" fill="#7c6aef" />
              </svg>
            </div>
            <h1 className="text-[18px] font-display font-bold text-fg-primary leading-none">Nemo</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings(true)}
              className="w-8 h-8 rounded-md flex items-center justify-center text-fg-muted hover:text-fg-secondary hover:bg-glass-surface transition-all"
              title="Settings"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6.5 1.5L6.2 3.1C5.8 3.3 5.4 3.5.8L3.5 3.2L2.5 8L3.3 6.9C3.3 7.1 3.3 7.3C3.3 7.9 3.3 8.1L2.9 2L3.5 3.6.9C3.3 7.3.3.7 3.3.8.1L12.5 11.8L14.9 8.1C15.7 7 9 15.7 7.9 15.7 7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                <circle cx="8" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>
            <button
              onClick={handleLock}
              className="w-8 h-8 rounded-md flex items-center justify-center text-fg-muted hover:text-destructive hover:bg-destructive/6 transition-all"
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
      </div>

      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all ${
              activeFilter === f.key
                ? 'bg-fg-primary text-surface shadow-sm'
                : 'glass text-fg-muted hover:text-fg-secondary'
            }`}
          >
            {f.label}
            <span className={`text-[10px] font-mono ${
              activeFilter === f.key ? 'text-surface/60' : 'text-fg-faint'
            }`}>
              {String(filterCounts[f.key as keyof typeof filterCounts]).padStart(2, '0')}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 pb-4">
          <EntryList
            entries={filteredEntries}
            onEdit={(entry) => { setEditingEntry(entry); setShowAddModal(true) }}
            onDelete={handleDeleteEntry}
            searchQuery={searchQuery}
          />
        </div>
      </div>

      <div className="px-5 pb-5 pt-3">
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full py-3.5 rounded-lg btn-primary text-[14px] flex items-center justify-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Credential
        </button>
      </div>

      {notification && (
        <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg ${
          notification.type === 'success' ? 'bg-success text-surface' : 'bg-destructive text-surface'
        }`}>
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

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
