

import { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import type { VaultRegistry } from '~/utils/types'

interface VaultSelectorProps {
  currentVaultId: string | null
  registry: VaultRegistry | null
  onSwitchVault: (vaultId: string) => Promise<void>
  onCreateVault: (name: string) => Promise<void>
}

export function VaultSelector({
  currentVaultId,
  registry,
  onSwitchVault,
  onCreateVault
}: VaultSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCreateInput, setShowCreateInput] = useState(false)
  const [newVaultName, setNewVaultName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentVault = useMemo(() =>
    registry?.vaults.find(v => v.id === currentVaultId),
    [registry?.vaults, currentVaultId]
  )
  const otherVaults = useMemo(() =>
    registry?.vaults.filter(v => v.id !== currentVaultId) ?? [],
    [registry?.vaults, currentVaultId]
  )

  useEffect(() => {
    if (showCreateInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showCreateInput])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setShowCreateInput(false)
        setNewVaultName('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSwitch = async (vaultId: string) => {
    if (vaultId === currentVaultId) {
      setIsOpen(false)
      return
    }
    setIsLoading(true)
    try {
      await onSwitchVault(vaultId)
    } finally {
      setIsLoading(false)
      setIsOpen(false)
    }
  }

  const handleCreate = async () => {
    const name = newVaultName.trim()
    if (!name) return
    setIsLoading(true)
    try {
      await onCreateVault(name)
      setShowCreateInput(false)
      setNewVaultName('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate()
    } else if (e.key === 'Escape') {
      setShowCreateInput(false)
      setNewVaultName('')
    }
  }

  if (!registry || registry.vaults.length === 0) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-[var(--surface)] transition-colors disabled:opacity-50"
      >
        <div className="w-5 h-5 rounded bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-[var(--accent-text)]">
            {currentVault?.name.charAt(0).toUpperCase() ?? 'V'}
          </span>
        </div>
        <span className="text-[13px] font-medium text-[var(--text-primary)] max-w-[100px] truncate">
          {currentVault?.name ?? 'Vault'}
        </span>
        <ChevronDown
          size={14}
          className={`text-[var(--text-tertiary)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-[var(--void)] border border-[var(--border)] rounded-lg shadow-lg z-50 animate-fade-in">
          <div className="px-3 py-2 border-b border-[var(--border)]">
            <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
              Vaults
            </span>
          </div>

          <div className="py-1">
            {otherVaults.map((vault) => (
              <button
                key={vault.id}
                onClick={() => handleSwitch(vault.id)}
                disabled={isLoading}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[var(--surface)] transition-colors text-left"
              >
                <div className="w-6 h-6 rounded bg-[var(--surface)] flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-medium text-[var(--text-secondary)]">
                    {vault.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] text-[var(--text-primary)] block truncate">
                    {vault.name}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {vault.entryCount} {vault.entryCount === 1 ? 'item' : 'items'}
                  </span>
                </div>
              </button>
            ))}

            {otherVaults.length > 0 && (
              <div className="my-1 border-t border-[var(--border)]" />
            )}

            {showCreateInput ? (
              <div className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newVaultName}
                    onChange={(e) => setNewVaultName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Vault name"
                    disabled={isLoading}
                    className="flex-1 px-2 py-1.5 text-[13px] bg-[var(--surface)] rounded border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    onClick={handleCreate}
                    disabled={isLoading || !newVaultName.trim()}
                    className="px-2 py-1.5 bg-[var(--accent)] text-[var(--accent-text)] rounded text-[12px] font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCreateInput(true)}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[var(--surface)] transition-colors text-left"
              >
                <div className="w-6 h-6 rounded border border-dashed border-[var(--border)] flex items-center justify-center flex-shrink-0">
                  <Plus size={12} className="text-[var(--text-muted)]" />
                </div>
                <span className="text-[13px] text-[var(--text-secondary)]">
                  Create new vault
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
