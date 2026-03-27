import { useState, useEffect } from 'react'
import type { VaultEntry } from '~/utils/types'
import { LockedView } from '~/components/locked-view'
import { AddEditModal } from '~/components/add-edit-modal'
import { SettingsModal } from '~/components/settings-modal'
import { EntryDetailModal } from '~/components/entry-detail-modal'
import '~/style.css'

type FilterType = 'all' | 'starred' | 'recent'

type VaultState = {
  isUnlocked: boolean
  vault: { entries: VaultEntry[]; settings: { autoLockMinutes: number; theme: 'light' | 'dark' | 'system' } } | null
  metadata: { version: string; vaultId: string; createdAt: number; updatedAt: number } | null
  lastActivity: number
}

type VaultExistsState = {
  exists: boolean
  hasCredential: boolean
}

export default function App() {
  const [state, setState] = useState<VaultState>({
    isUnlocked: false,
    vault: null,
    metadata: null,
    lastActivity: Date.now()
  })
  const [vaultExists, setVaultExists] = useState<VaultExistsState | null>(null)
  const [hasPinSetup, setHasPinSetup] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [viewingEntry, setViewingEntry] = useState<VaultEntry | null>(null)
  const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUnlocking, setIsUnlocking] = useState(false)

  useEffect(() => {
    loadStateWithRetry()
  }, [])

  const loadStateWithRetry = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const [stateResponse, existsResponse, pinResponse] = await Promise.all([
          chrome.runtime.sendMessage({ type: 'GET_VAULT_STATE' }),
          chrome.runtime.sendMessage({ type: 'CHECK_VAULT_EXISTS' }),
          chrome.runtime.sendMessage({ type: 'HAS_PIN_SETUP' })
        ])
        if (stateResponse.success) {
          setState(stateResponse.data)
          if (existsResponse.success) {
            setVaultExists(existsResponse.data)
          }
          if (pinResponse.success) {
            setHasPinSetup(pinResponse.data)
          }
          break
        }
      } catch (error: any) {
        if (error.message?.includes('Receiving end does not exist')) {
          if (i === retries - 1) {
            setError('Extension starting up. Please wait.')
          } else {
            await new Promise((r) => setTimeout(r, 500))
            continue
          }
        } else {
          setError(String(error))
        }
      } finally {
        setLoading(false)
      }
    }
  }

  const handleUnlock = async () => {
    try {
      setIsUnlocking(true)
      const response = await chrome.runtime.sendMessage({ type: 'UNLOCK_VAULT' })
      if (response.success) {
        setTimeout(() => {
          setState((prev: any) => ({ ...prev, isUnlocked: true, vault: response.data }))
          setIsUnlocking(false)
        }, 800)
      } else {
        throw new Error(response.error || 'Failed to unlock vault')
      }
    } catch (error: any) {
      setError(String(error))
      setIsUnlocking(false)
    }
  }

  const handleCreate = async () => {
    try {
      setIsUnlocking(true)
      const response = await chrome.runtime.sendMessage({ type: 'CREATE_VAULT' })
      if (response.success) {
        setTimeout(() => {
          setState((prev: any) => ({
            ...prev,
            isUnlocked: true,
            metadata: response.data,
            vault: { entries: [], settings: { autoLockMinutes: 15, theme: 'dark' } }
          }))
          setIsUnlocking(false)
        }, 800)
      } else {
        throw new Error(response.error || 'Failed to create vault')
      }
    } catch (error: any) {
      setError(String(error))
      setIsUnlocking(false)
    }
  }

  const handleRecoveryCreate = async (phrase: string) => {
    const response = await chrome.runtime.sendMessage({ type: 'CREATE_VAULT_FROM_RECOVERY', payload: phrase })
    if (response.success) {
      setState((prev: any) => ({
        ...prev,
        isUnlocked: true,
        metadata: response.data,
        vault: { entries: [], settings: { autoLockMinutes: 15, theme: 'dark' } }
      }))
    } else {
      throw new Error(response.error || 'Failed to create vault')
    }
  }

  const handleRecoveryUnlock = async (phrase: string) => {
    const response = await chrome.runtime.sendMessage({ type: 'UNLOCK_VAULT_FROM_RECOVERY', payload: phrase })
    if (response.success) {
      setState((prev: any) => ({ ...prev, isUnlocked: true, vault: response.data }))
    } else {
      throw new Error(response.error || 'Failed to unlock vault')
    }
  }

  const handlePinUnlock = async (pin: string) => {
    const response = await chrome.runtime.sendMessage({ type: 'UNLOCK_VAULT_WITH_PIN', payload: pin })
    if (response.success) {
      setState((prev: any) => ({ ...prev, isUnlocked: true, vault: response.data }))
    } else {
      throw new Error(response.error || 'Failed to unlock with PIN')
    }
  }

  const handleLock = async () => {
    await chrome.runtime.sendMessage({ type: 'LOCK_VAULT' })
    setState({
      isUnlocked: false,
      vault: null,
      metadata: null,
      lastActivity: Date.now()
    })
  }

  const handleAddEntry = async (entry: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const response = await chrome.runtime.sendMessage({ type: 'ADD_ENTRY', payload: entry })
    if (response.success) {
      setState((prev: any) => ({
        ...prev,
        vault: prev.vault ? { ...prev.vault, entries: [...prev.vault.entries, response.data] } : null
      }))
    }
    setShowAddModal(false)
  }

  const handleEditEntry = async (updates: Partial<VaultEntry>) => {
    if (!editingEntry) return
    const response = await chrome.runtime.sendMessage({
      type: 'UPDATE_ENTRY',
      payload: { id: editingEntry.id, updates }
    })
    if (response.success) {
      setState((prev: any) => ({
        ...prev,
        vault: prev.vault ? { ...prev.vault, entries: prev.vault.entries.map((e: any) => e.id === editingEntry.id ? response.data : e) } : null
      }))
    }
    setEditingEntry(null)
    setViewingEntry(null)
  }

  const handleDeleteEntry = async (id: string) => {
    const response = await chrome.runtime.sendMessage({ type: 'DELETE_ENTRY', payload: id })
    if (response.success) {
      setState((prev: any) => ({
        ...prev,
        vault: prev.vault ? { ...prev.vault, entries: prev.vault.entries.filter((e: any) => e.id !== id) } : null
      }))
    }
    setViewingEntry(null)
    setEditingEntry(null)
  }

  const handleExport = async () => {
    const response = await chrome.runtime.sendMessage({ type: 'EXPORT_VAULT' })
    if (response.success) {
      const blob = new Blob([response.data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nemo-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleImport = async (data: string) => {
    const response = await chrome.runtime.sendMessage({ type: 'IMPORT_VAULT', payload: data })
    if (response.success) {
      setState((prev: any) => ({ ...prev, vault: response.data }))
    }
  }

  const handleSettingsChange = async (settings: Partial<{ autoLockMinutes: number }>) => {
    await chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', payload: settings })
    setState((prev: any) => ({
      ...prev,
      vault: prev.vault ? { ...prev.vault, settings: { ...prev.vault.settings, ...settings } } : null
    }))
  }

  const handleEditFromDetail = () => {
    setEditingEntry(viewingEntry)
    setViewingEntry(null)
    setShowAddModal(true)
  }

  const handleDeleteFromDetail = () => {
    if (viewingEntry) {
      handleDeleteEntry(viewingEntry.id)
    }
  }

  const allEntries = state.vault?.entries ?? []
  const now = Date.now()
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000

  const filteredEntries = allEntries
    .filter((entry: any) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return entry.title.toLowerCase().includes(query) ||
          (entry.username?.toLowerCase().includes(query) ?? false) ||
          (entry.url?.toLowerCase().includes(query) ?? false)
      }
      switch (activeFilter) {
        case 'starred': return entry.favorite === true
        case 'recent': return entry.updatedAt > oneWeekAgo
        default: return true
      }
    })
    .sort((a: any, b: any) => {
      if (a.favorite && !b.favorite) return -1
      if (!a.favorite && b.favorite) return 1
      return b.updatedAt - a.updatedAt
    })

  if (loading) {
    return (
      <div className="w-[400px] min-h-[560px] flex items-center justify-center bg-[var(--void)]">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-3 rounded-lg bg-[var(--gold)] animate-pulse"></div>
          <p className="text-[var(--text-secondary)] text-sm">Loading Nemo...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-[400px] min-h-[560px] p-8 flex flex-col items-center justify-center bg-[var(--void)]">
        <div className="w-full p-4 mb-4 bg-[var(--danger-bg)] rounded-xl border border-[var(--danger)] border-opacity-20">
          <p className="text-[var(--danger)] text-sm font-medium">{error}</p>
        </div>
        <button 
          onClick={() => { setError(null); loadStateWithRetry() }}
          className="px-6 py-3 nemo-button-secondary"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!state.isUnlocked) {
    return (
      <LockedView 
        onUnlock={handleUnlock} 
        onCreate={handleCreate} 
        onRecoveryCreate={handleRecoveryCreate}
        onRecoveryUnlock={handleRecoveryUnlock}
        onPinUnlock={handlePinUnlock}
        vaultExists={vaultExists?.exists}
        hasCredential={vaultExists?.hasCredential}
        hasPinSetup={hasPinSetup}
        entryCount={allEntries.length}
        lastSync={state.lastActivity}
      />
    )
  }

  const entryCount = allEntries.length
  const starredCount = allEntries.filter((e: any) => e.favorite).length

  const getFaviconUrl = (url: string | undefined): string | null => {
    if (!url) return null
    try {
      const urlObj = new URL(url)
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`
    } catch {
      return null
    }
  }

  const getDomain = (url: string | undefined): string => {
    if (!url) return ''
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.replace('www.', '')
    } catch {
      return ''
    }
  }

  const formatLastActive = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="w-[400px] min-h-[500px] flex flex-col bg-[var(--void)]">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[var(--surface)] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-[var(--text-primary)] text-sm">Nemo</span>
              <span className="text-[var(--text-tertiary)] text-[11px]">Vault unlocked</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={handleLock}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors rounded-md"
              title="Lock vault"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 1 1 10 0v4" />
              </svg>
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors rounded-md"
              title="Settings"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="w-full nemo-input pl-10 pr-4 py-2.5 text-sm"
          />
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="flex gap-1.5">
          {[
            { key: 'all', label: 'All', count: entryCount },
            { key: 'starred', label: 'Starred', count: starredCount },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key as FilterType)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeFilter === filter.key
                  ? 'bg-[var(--gold)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]'
              }`}
            >
              {filter.label} {filter.count}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 overflow-auto">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-[var(--surface)] flex items-center justify-center mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
              {searchQuery ? 'No matches' : 'No passwords yet'}
            </h3>
            <p className="text-[var(--text-tertiary)] text-sm mb-4 max-w-[200px]">
              {searchQuery 
                ? 'Try a different search' 
                : 'Add your first password to secure it here.'}
            </p>
            
            {!searchQuery && (
              <button
                onClick={() => setShowAddModal(true)}
                className="nemo-button-primary px-5 py-2.5 text-sm"
              >
                Add password
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredEntries.map((entry: any) => (
              <div 
                key={entry.id} 
                className="flex items-center gap-3 p-2.5 -mx-1 rounded-lg cursor-pointer hover:bg-[var(--surface)] transition-colors group"
                onClick={() => setViewingEntry(entry)}
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--surface)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {getFaviconUrl(entry.url) ? (
                    <img 
                      src={getFaviconUrl(entry.url)!} 
                      alt="" 
                      className="w-5 h-5"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <span className={`text-sm font-semibold text-[var(--text-secondary)] ${getFaviconUrl(entry.url) ? 'hidden' : ''}`}>
                    {entry.title.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{entry.title}</p>
                  <p className="text-xs text-[var(--text-tertiary)] truncate">
                    {entry.username || getDomain(entry.url) || 'No username'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {entry.favorite && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--gold)" stroke="none">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  )}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-tertiary)]">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {filteredEntries.length > 0 && (
        <div className="p-4 border-t border-[var(--border)]">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full nemo-button-primary py-2.5 text-sm font-medium flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add password
          </button>
        </div>
      )}

      <AddEditModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingEntry(null) }}
        onSave={editingEntry ? handleEditEntry : handleAddEntry}
        entry={editingEntry ?? undefined}
      />

      <EntryDetailModal
        entry={viewingEntry}
        isOpen={!!viewingEntry}
        onClose={() => setViewingEntry(null)}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteFromDetail}
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
