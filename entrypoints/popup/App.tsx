import { useState, useEffect } from 'react'
import '~/style.css'
import type { VaultEntry, VaultState } from '~/utils/types'
import { LockedView } from '~/components/locked-view'
import { EntryList } from '~/components/entry-card'
import { AddEditModal } from '~/components/add-edit-modal'
import { SettingsModal } from '~/components/settings-modal'
import { SearchBar, Button, Spinner } from '~/components/ui'

type FilterType = 'all' | 'login' | 'favorite' | 'recent'

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
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  useEffect(() => {
    loadStateWithRetry()
  }, [])

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
          setDebugInfo(getDebugInfo(error))
          console.error('Failed to load state:', error)
        }
      } finally {
        setLoading(false)
      }
    }
  }

  const handleUnlock = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'UNLOCK_VAULT' })
      if (response.success) {
        setState((prev) => ({ ...prev, isUnlocked: true, vault: response.data }))
      } else {
        throw new Error(response.error || 'Failed to unlock vault')
      }
    } catch (error: any) {
      if (error.message?.includes('Receiving end does not exist')) {
        setError('Extension starting up. Please wait.')
      } else {
        setError(String(error))
        setDebugInfo(getDebugInfo(error))
        console.error('Unlock error:', error)
      }
    }
  }

  const handleCreate = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CREATE_VAULT' })
      if (response.success) {
        setState((prev) => ({
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
        setDebugInfo(getDebugInfo(error))
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
        setDebugInfo(getDebugInfo(error))
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
        setState((prev) => ({
          ...prev,
          vault: prev.vault
            ? { ...prev.vault, entries: [...prev.vault.entries, response.data] }
            : null
        }))
      }
      setShowAddModal(false)
    } catch (error: any) {
      if (error.message?.includes('Receiving end does not exist')) {
        setError('Extension starting up. Please wait.')
      } else {
        setError(String(error))
        setDebugInfo(getDebugInfo(error))
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
        setState((prev) => ({
          ...prev,
          vault: prev.vault
            ? {
                ...prev.vault,
                entries: prev.vault.entries.map((e) =>
                  e.id === editingEntry.id ? response.data : e
                )
              }
            : null
        }))
      }
      setEditingEntry(null)
    } catch (error: any) {
      if (error.message?.includes('Receiving end does not exist')) {
        setError('Extension starting up. Please wait.')
      } else {
        setError(String(error))
        setDebugInfo(getDebugInfo(error))
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
        setState((prev) => ({
          ...prev,
          vault: prev.vault
            ? { ...prev.vault, entries: prev.vault.entries.filter((e) => e.id !== id) }
            : null
        }))
      }
    } catch (error: any) {
      if (error.message?.includes('Receiving end does not exist')) {
        setError('Extension starting up. Please wait.')
      } else {
        setError(String(error))
        setDebugInfo(getDebugInfo(error))
        console.error('Delete entry error:', error)
      }
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
      }
    } catch (error: any) {
      if (error.message?.includes('Receiving end does not exist')) {
        setError('Extension starting up. Please wait.')
      } else {
        setError(String(error))
        setDebugInfo(getDebugInfo(error))
        console.error('Export error:', error)
      }
    }
  }

  const handleImport = async (data: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'IMPORT_VAULT',
        payload: data
      })
      if (response.success) {
        setState((prev) => ({
          ...prev,
          vault: response.data
        }))
      } else {
        throw new Error(response.error || 'Failed to import vault')
      }
    } catch (error: any) {
      if (error.message?.includes('Receiving end does not exist')) {
        setError('Extension starting up. Please wait.')
      } else {
        setError(String(error))
        setDebugInfo(getDebugInfo(error))
        console.error('Import error:', error)
      }
    }
  }

  const handleSettingsChange = async (settings: Partial<{ autoLockMinutes: number; theme: 'light' | 'dark' | 'system' }>) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        payload: settings
      })
      if (response.success) {
        setState((prev) => ({
          ...prev,
          vault: prev.vault
            ? { ...prev.vault, settings: { ...prev.vault.settings, ...settings } }
            : null
        }))
      }
    } catch (error: any) {
      if (error.message?.includes('Receiving end does not exist')) {
        setError('Extension starting up. Please wait.')
      } else {
        setError(String(error))
        setDebugInfo(getDebugInfo(error))
        console.error('Settings error:', error)
      }
    }
  }

  const allEntries = state.vault?.entries ?? []
  const now = Date.now()
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000

  const filteredEntries = allEntries
    .filter((entry) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          entry.title.toLowerCase().includes(query) ||
          (entry.username?.toLowerCase().includes(query) ?? false) ||
          (entry.url?.toLowerCase().includes(query) ?? false) ||
          (entry.tags?.some((t) => t.toLowerCase().includes(query)) ?? false) ||
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
    .sort((a, b) => {
      if (a.favorite && !b.favorite) return -1
      if (!a.favorite && b.favorite) return 1
      return b.updatedAt - a.updatedAt
    })

  const filterCounts = {
    all: allEntries.length,
    login: allEntries.length,
    favorite: allEntries.filter((e) => e.favorite).length,
    recent: allEntries.filter((e) => e.updatedAt > oneWeekAgo).length
  }

  if (loading) {
    return (
      <div className="w-[380px] h-[580px] flex items-center justify-center bg-base">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <span className="text-[14px] text-fg-muted">Nemo</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-[380px] max-h-[600px] bg-base p-6">
        <div className="bg-danger/6 border border-danger/12 rounded-xl p-5">
          <h3 className="text-[15px] font-semibold text-fg-primary mb-2">Something went wrong</h3>
          <p className="text-[13px] text-fg-secondary leading-relaxed">{error}</p>
          {debugInfo && (
            <div className="mt-4 p-3.5 bg-base rounded-lg text-[11px] text-fg-muted font-mono overflow-auto leading-relaxed">
              {debugInfo}
            </div>
          )}
          <Button variant="secondary" onClick={() => { setError(null); setDebugInfo(null); loadStateWithRetry(); }} className="mt-4 w-full">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!state.isUnlocked) {
    return (
      <div className="w-[380px] bg-base">
        <LockedView onUnlock={handleUnlock} onCreate={handleCreate} />
      </div>
    )
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'login', label: 'Login' },
    { key: 'favorite', label: 'Starred' },
    { key: 'recent', label: 'Recent' }
  ]

  return (
    <div className="w-[380px] h-[580px] bg-base flex flex-col">
      <div className="flex flex-col h-full">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-accent/15 border border-accent/20 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1.5C5.067 1.5 3.5 3.067 3.5 5V6H3C2.448 6 2 6.448 2 7V12C2 12.552 2.448 13 3 13H11C11.552 13 12 12.552 12 12V7C12 6.448 11.552 6 11 6H10.5V5C10.5 3.067 8.933 1.5 7 1.5ZM5 5C5 3.895 5.895 3 7 3C8.105 3 9 3.895 9 5V6H5V5Z" fill="#7c6aef" />
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
                  <path d="M6.5 1.5L6.2 3.1C5.8 3.3 5.4 3.5 5.1 3.8L3.5 3.2L2 5.8L3.3 6.9C3.3 7.1 3.3 7.3 3.3 7.5C3.3 7.7 3.3 7.9 3.3 8.1L2 9.2L3.5 11.8L5.1 11.2C5.4 11.5 5.8 11.7 6.2 11.9L6.5 13.5H9.5L9.8 11.9C10.2 11.7 10.6 11.5 10.9 11.2L12.5 11.8L14 9.2L12.7 8.1C12.7 7.9 12.7 7.7 12.7 7.5C12.7 7.3 12.7 7.1 12.7 6.9L14 5.8L12.5 3.2L10.9 3.8C10.6 3.5 10.2 3.3 9.8 3.1L9.5 1.5H6.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  <circle cx="8" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </button>
              <button
                onClick={handleLock}
                className="w-8 h-8 rounded-md flex items-center justify-center text-fg-muted hover:text-danger hover:bg-danger/6 transition-all"
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

          <SearchBar value={searchQuery} onChange={setSearchQuery} />

          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all ${
                  activeFilter === f.key
                    ? 'bg-fg-primary text-base-surface shadow-sm'
                    : 'glass text-fg-muted hover:text-fg-secondary'
                }`}
              >
                {f.label}
                <span className={`text-[10px] font-mono ${
                  activeFilter === f.key ? 'text-base-surface/60' : 'text-fg-faint'
                }`}>
                  {String(filterCounts[f.key]).padStart(2, '0')}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2 pb-4">
            <EntryList
              entries={filteredEntries}
              onEdit={(entry) => { setEditingEntry(entry); setShowAddModal(true); }}
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
      </div>

      <AddEditModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingEntry(null); }}
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

function getDebugInfo(error: unknown): string {
  if (error instanceof Error) {
    return `Stack: ${error.stack}\nMessage: ${error.message}`
  }
  return `Error: ${String(error)}`
}
