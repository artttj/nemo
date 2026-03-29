/**
 * Copyright 2024-2025 Artem Iagovdik <artyom.yagovdik@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { VaultEntry, VaultRegistry } from '~/utils/types'
import { getFaviconUrl } from '~/utils/vault'
import { getDomain } from '~/utils/url'
import { LockedView } from '~/components/locked-view'
import { VaultSetup } from '~/components/vault-setup'
import { AddEditModal } from '~/components/add-edit-modal'
import { SettingsModal } from '~/components/settings-modal'
import { EntryDetailModal } from '~/components/entry-detail-modal'
import { VaultSelector } from '~/components/vault-selector'
import { TOTPDisplay } from '~/components/totp-display'
import '~/style.css'

type FilterType = 'all' | 'recent'

type SitePreferences = {
  hostname: string
  autoFillMode: 'always' | 'never' | 'ask'
  preferredEntryId?: string
  createdAt: number
  updatedAt: number
}

type VaultState = {
  isUnlocked: boolean
  vault: {
    entries: VaultEntry[]
    settings: {
      autoLockMinutes: number
      theme: 'light' | 'dark' | 'system'
      sitePreferences?: Record<string, SitePreferences>
    }
  } | null
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
  const [pinLength, setPinLength] = useState(4)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [viewingEntry, setViewingEntry] = useState<VaultEntry | null>(null)
  const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [vaultRegistry, setVaultRegistry] = useState<VaultRegistry | null>(null)
  const [showVaultSetup, setShowVaultSetup] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)

  useEffect(() => {
    loadStateWithRetry()
  }, [])

  // Poll for state changes (e.g., after WebAuthn redirect)
  useEffect(() => {
    if (state.isUnlocked) return

    let pollCount = 0
    const maxPolls = 20 // Poll for up to 10 seconds (20 * 500ms)

    const poll = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_VAULT_STATE' })
        if (response.success && response.data.isUnlocked && !state.isUnlocked) {
          setState(response.data)
          setLoading(false)
        }
      } catch {
      }
      pollCount++
      if (pollCount < maxPolls && !state.isUnlocked) {
        pollTimeout = setTimeout(poll, 500)
      }
    }

    let pollTimeout: ReturnType<typeof setTimeout> | null = setTimeout(poll, 500)

    return () => {
      if (pollTimeout) clearTimeout(pollTimeout)
    }
  }, [state.isUnlocked])

  const loadStateWithRetry = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const [stateResponse, existsResponse, pinResponse, pinLengthResponse, registryResponse] = await Promise.all([
          chrome.runtime.sendMessage({ type: 'GET_VAULT_STATE' }),
          chrome.runtime.sendMessage({ type: 'CHECK_VAULT_EXISTS' }),
          chrome.runtime.sendMessage({ type: 'HAS_PIN_SETUP' }),
          chrome.runtime.sendMessage({ type: 'GET_PIN_LENGTH' }),
          chrome.runtime.sendMessage({ type: 'GET_VAULT_REGISTRY' })
        ])
        if (stateResponse.success) {
          setState(stateResponse.data)
          if (existsResponse.success) {
            setVaultExists(existsResponse.data)
          }
          if (pinResponse.success) {
            setHasPinSetup(pinResponse.data)
          }
          if (pinLengthResponse.success) {
            setPinLength(pinLengthResponse.data)
          }
          if (registryResponse.success) {
            setVaultRegistry(registryResponse.data)
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
          setState((prev) => ({ ...prev, isUnlocked: true, vault: response.data }))
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
    setShowVaultSetup(true)
  }

  const handleVaultSetupCreate = async (recoveryPhrase: string, enableTouchId: boolean) => {
    const response = await chrome.runtime.sendMessage({
      type: 'CREATE_VAULT_WITH_OPTIONS',
      payload: { recoveryPhrase, enableTouchId }
    })
    if (response.success) {
      setShowVaultSetup(false)
      setVaultExists({ exists: true, hasCredential: enableTouchId })
      setState((prev) => ({
        ...prev,
        isUnlocked: true,
        metadata: response.data.metadata,
        vault: { entries: [], settings: { autoLockMinutes: 15, theme: 'dark' } }
      }))
    } else {
      throw new Error(response.error || 'Failed to create vault')
    }
  }

  const handleRecoveryCreate = async (phrase: string) => {
    const response = await chrome.runtime.sendMessage({ type: 'CREATE_VAULT_FROM_RECOVERY', payload: phrase })
    if (response.success) {
      setState((prev) => ({
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
      setState((prev) => ({ ...prev, isUnlocked: true, vault: response.data }))
    } else {
      throw new Error(response.error || 'Failed to unlock vault')
    }
  }

  const handlePinUnlock = async (pin: string) => {
    const response = await chrome.runtime.sendMessage({ type: 'UNLOCK_VAULT_WITH_PIN', payload: pin })
    if (response.success) {
      setState((prev) => ({ ...prev, isUnlocked: true, vault: response.data }))
    } else {
      throw new Error(response.error || 'Failed to unlock with PIN')
    }
  }

  const handleLock = async () => {
    await chrome.runtime.sendMessage({ type: 'LOCK_VAULT' })
    await loadStateWithRetry()
  }

  const handleSwitchVault = async (vaultId: string) => {
    const response = await chrome.runtime.sendMessage({ type: 'SET_ACTIVE_VAULT', payload: vaultId })
    if (response.success) {
      await loadStateWithRetry()
    } else {
      throw new Error(response.error || 'Failed to switch vault')
    }
  }

  const handleCreateNewVault = async (name: string) => {
    const response = await chrome.runtime.sendMessage({ type: 'CREATE_NEW_VAULT', payload: { name } })
    if (response.success) {
      await handleSwitchVault(response.data.id)
    } else {
      throw new Error(response.error || 'Failed to create vault')
    }
  }

  const handleAddEntry = async (entry: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'ADD_ENTRY', payload: entry })
      if (response.success) {
        setState((prev) => ({
          ...prev,
          vault: prev.vault ? { ...prev.vault, entries: [...prev.vault.entries, response.data] } : null
        }))
        setShowAddModal(false)
        setError(null)
      } else {
        setError(response.error || 'Failed to add entry')
      }
    } catch (error: any) {
      setError(error.message || 'Failed to add entry')
    }
  }

  const handleEditEntry = async (updates: Partial<VaultEntry>) => {
    if (!editingEntry) return
    const response = await chrome.runtime.sendMessage({
      type: 'UPDATE_ENTRY',
      payload: { id: editingEntry.id, updates }
    })
    if (response.success) {
      setState((prev) => ({
        ...prev,
        vault: prev.vault ? { ...prev.vault, entries: prev.vault.entries.map((e) => e.id === editingEntry.id ? response.data : e) } : null
      }))
    }
    setEditingEntry(null)
    setViewingEntry(null)
  }

  const handleDeleteEntry = async (id: string) => {
    const response = await chrome.runtime.sendMessage({ type: 'DELETE_ENTRY', payload: id })
    if (response.success) {
      setState((prev) => ({
        ...prev,
        vault: prev.vault ? { ...prev.vault, entries: prev.vault.entries.filter((e) => e.id !== id) } : null
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
      setState((prev) => ({ ...prev, vault: response.data }))
    }
  }

  const handleSettingsChange = async (settings: Partial<{ autoLockMinutes: number }>) => {
    await chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', payload: settings })
    setState((prev) => ({
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

  const handleRestoreFromDetail = async (entryId: string, version: number) => {
    const response = await chrome.runtime.sendMessage({
      type: 'RESTORE_ENTRY_VERSION',
      payload: { entryId, version }
    })
    if (response.success) {
      setViewingEntry(response.data)
      await loadStateWithRetry()
    }
  }

  const handleSaveSitePreferences = async (hostname: string, preferences: { autoFillMode: 'always' | 'never' | 'ask'; preferredEntryId?: string }) => {
    const response = await chrome.runtime.sendMessage({
      type: 'SET_SITE_PREFERENCES',
      payload: { hostname, preferences }
    })
    if (response.success) {
      await loadStateWithRetry()
    }
  }

  const getSitePreferencesForEntry = (entry: VaultEntry | null) => {
    if (!entry?.url) return null
    const hostname = getDomain(entry.url) || entry.url
    return state.vault?.settings?.sitePreferences?.[hostname] || null
  }

  const allEntries = state.vault?.entries ?? []

  const recentCount = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return allEntries.filter((e: any) => e.updatedAt > oneWeekAgo).length
  }, [allEntries])

  const filteredEntries = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return allEntries
      .filter((entry: any) => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          return entry.title.toLowerCase().includes(query) ||
            (entry.username?.toLowerCase().includes(query) ?? false) ||
            (entry.url?.toLowerCase().includes(query) ?? false)
        }
        if (activeFilter === 'recent') return entry.updatedAt > oneWeekAgo
        return true
      })
      .sort((a: any, b: any) => b.updatedAt - a.updatedAt)
  }, [allEntries, searchQuery, activeFilter])

  // Keyboard navigation
  useEffect(() => {
    if (!state.isUnlocked) return
    if (showAddModal || showSettings || viewingEntry) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const entryCount = filteredEntries.length
      if (entryCount === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => prev < entryCount - 1 ? prev + 1 : 0)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => prev > 0 ? prev - 1 : entryCount - 1)
          break
        case 'Enter':
          if (selectedIndex >= 0 && selectedIndex < entryCount) {
            e.preventDefault()
            const entry = filteredEntries[selectedIndex]
            if (entry?.password) {
              navigator.clipboard.writeText(entry.password)
              setSelectedIndex(-1)
            }
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.isUnlocked, filteredEntries, selectedIndex, showAddModal, showSettings, viewingEntry])

  // Scroll selected element into view after keyboard navigation
  useEffect(() => {
    if (selectedIndex >= 0) {
      const element = document.querySelector(`[data-selected="true"]`) as HTMLElement
      element?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  const handlePinSetup = useCallback(async (pin: string) => {
    const response = await chrome.runtime.sendMessage({ type: 'SETUP_VAULT_PIN', payload: pin })
    if (response.success) setHasPinSetup(true)
    return response
  }, [])

  const handlePinRemove = useCallback(async () => {
    const response = await chrome.runtime.sendMessage({ type: 'REMOVE_VAULT_PIN' })
    if (response.success) setHasPinSetup(false)
    return response
  }, [])

  const handleRenameVault = useCallback(async (vaultId: string, name: string) => {
    const response = await chrome.runtime.sendMessage({ type: 'RENAME_VAULT', payload: { vaultId, name } })
    if (response.success) {
      await loadStateWithRetry()
    }
    return response
  }, [])

  const handleDeleteVault = useCallback(async (vaultId: string) => {
    const response = await chrome.runtime.sendMessage({ type: 'DELETE_VAULT', payload: vaultId })
    if (response.success) {
      await loadStateWithRetry()
    }
    return response
  }, [])

  if (loading) {
    return (
      <div className="w-[400px] min-h-[560px] flex items-center justify-center bg-[var(--void)]">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-3 rounded-lg bg-[var(--accent)] animate-pulse"></div>
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

  if (showVaultSetup) {
    return (
      <VaultSetup
        onBack={() => setShowVaultSetup(false)}
        onCreate={handleVaultSetupCreate}
      />
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
        pinLength={pinLength}
        entryCount={allEntries.length}
        lastSync={state.lastActivity}
      />
    )
  }

  const entryCount = allEntries.length

  return (
    <div className="w-[400px] min-h-[500px] flex flex-col bg-[var(--void)]">
      <div className="px-4 py-3 nemo-divider-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <VaultSelector
              currentVaultId={state.metadata?.vaultId ?? null}
              registry={vaultRegistry}
              onSwitchVault={handleSwitchVault}
              onCreateVault={handleCreateNewVault}
            />
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleLock}
              className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors rounded-lg"
              title="Lock vault"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 1 1 10 0v4" />
              </svg>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors rounded-lg"
              title="Settings"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search passwords..."
            className="w-full nemo-input pl-9 pr-4 py-2 text-sm"
          />
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="flex gap-1">
          {[
            { key: 'all', label: 'All', count: entryCount },
            { key: 'recent', label: 'Recent', count: recentCount },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key as FilterType)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeFilter === filter.key
                  ? 'bg-[var(--surface)] text-[var(--text-primary)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface)]'
              }`}
            >
              {filter.label} <span className="text-[var(--text-muted)] ml-0.5">{filter.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 overflow-auto">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--surface)] flex items-center justify-center mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">
              {searchQuery ? 'No matches' : 'No passwords yet'}
            </h3>
            <p className="text-[var(--text-tertiary)] text-[13px] mb-5 max-w-[220px] leading-relaxed">
              {searchQuery
                ? 'Try a different search term'
                : 'Add your first password to get started.'}
            </p>

            {!searchQuery && (
              <button
                onClick={() => setShowAddModal(true)}
                className="nemo-button-primary px-5 py-2.5 text-[13px]"
              >
                Add password
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredEntries.map((entry: any, index: number) => {
              const favicon = getFaviconUrl(entry.url)
              const isSelected = index === selectedIndex
              return (
              <div
                key={entry.id}
                className={`nemo-entry-row flex items-center gap-3 px-2.5 py-2.5 -mx-1 rounded-lg cursor-pointer hover:bg-[var(--surface)] group ${
                  isSelected ? 'bg-[var(--surface)] ring-1 ring-[var(--accent)]' : ''
                }`}
                onClick={() => setViewingEntry(entry)}
                data-selected={isSelected}
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--surface)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {favicon ? (
                    <img
                      src={favicon}
                      alt=""
                      className="w-5 h-5"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement
                        img.style.display = 'none'
                        const sibling = img.nextElementSibling as HTMLElement | null
                        if (sibling) {
                          sibling.classList.remove('hidden')
                        }
                      }}
                    />
                  ) : null}
                  <span className={`text-[13px] font-semibold text-[var(--text-tertiary)] ${favicon ? 'hidden' : ''}`}>
                    {entry.title.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{entry.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                      {entry.username || getDomain(entry.url) || 'No username'}
                    </p>
                    {entry.totp && (
                      <TOTPDisplay config={entry.totp} compact />
                    )}
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
              )
            })}
          </div>
        )}
      </div>

      {filteredEntries.length > 0 && (
        <div className="px-4 py-3 nemo-divider-bottom">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full nemo-button-primary py-2.5 text-[13px] font-medium flex items-center justify-center gap-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
        onRestore={handleRestoreFromDetail}
        sitePreferences={getSitePreferencesForEntry(viewingEntry)}
        onSaveSitePreferences={handleSaveSitePreferences}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={state.vault?.settings ?? null}
        onExport={handleExport}
        onImport={handleImport}
        onSettingsChange={handleSettingsChange}
        hasPinSetup={hasPinSetup}
        onPinSetup={handlePinSetup}
        onPinRemove={handlePinRemove}
        vaultRegistry={vaultRegistry}
        currentVaultId={state.metadata?.vaultId ?? null}
        onRenameVault={handleRenameVault}
        onDeleteVault={handleDeleteVault}
      />
    </div>
  )
}
