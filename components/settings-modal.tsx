import { useState, useEffect } from 'react'
import type { VaultSettings } from '~/utils/types'

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onExport,
  onImport,
  onSettingsChange
}: {
  isOpen: boolean
  onClose: () => void
  settings: VaultSettings | null
  onExport: () => Promise<void>
  onImport: (data: string) => Promise<void>
  onSettingsChange: (settings: Partial<VaultSettings>) => void
}) {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [activeSection, setActiveSection] = useState<'autoLock' | 'backup' | 'security'>('autoLock')

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
    } else {
      setTimeout(() => setIsVisible(false), 300)
    }
  }, [isOpen])

  const handleExport = async () => {
    setExporting(true)
    try { await onExport() } finally { setExporting(false) }
  }

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setImporting(true)
      try {
        const text = await file.text()
        await onImport(text)
        onClose()
      } finally { setImporting(false) }
    }
    input.click()
  }

  if (!isVisible) return null

  const menuItems = [
    { key: 'autoLock', label: 'Auto Lock', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
    { key: 'backup', label: 'Backup', icon: 'M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5 5-5M12 4v12' },
    { key: 'security', label: 'Security', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }
  ]

  return (
    <div 
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
    >
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div 
        className={`absolute right-0 top-0 h-full w-[400px] bg-[var(--void)] transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ borderLeft: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Settings</h2>
          <button 
            onClick={onClose}
            className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors rounded-lg hover:bg-[var(--surface)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex px-6 py-3 gap-2 border-b border-[var(--border)]">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key as typeof activeSection)}
              className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-2 transition-all rounded-lg text-sm font-medium ${
                activeSection === item.key 
                  ? 'bg-[var(--surface)] text-[var(--text-primary)]' 
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100% - 140px)' }}>
          {activeSection === 'autoLock' && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Auto lock timeout</label>
                <p className="text-[var(--text-tertiary)] text-sm mb-4">Lock your vault after a period of inactivity.</p>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 5, 15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => onSettingsChange({ autoLockMinutes: mins })}
                      className={`py-3 text-sm font-semibold rounded-xl transition-all ${
                        (settings?.autoLockMinutes ?? 15) === mins
                          ? 'bg-[var(--gold)] text-white'
                          : 'bg-[var(--void-elevated)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)]'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'backup' && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Data backup</label>
                <p className="text-[var(--text-tertiary)] text-sm mb-4">Export or import your vault to migrate devices.</p>
                <div className="space-y-3">
                  <button 
                    onClick={handleExport} 
                    disabled={exporting}
                    className="w-full py-4 px-4 flex items-center justify-between bg-[var(--void-elevated)] border border-[var(--border)] rounded-xl text-[var(--text-secondary)] hover:border-[var(--border-hover)] transition-all disabled:opacity-50"
                  >
                    <span className="font-medium text-sm">{exporting ? 'Exporting...' : 'Export vault'}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                  </button>
                  <button 
                    onClick={handleImport} 
                    disabled={importing}
                    className="w-full py-4 px-4 flex items-center justify-between border border-[var(--border)] rounded-xl text-[var(--text-secondary)] hover:border-[var(--border-hover)] transition-all disabled:opacity-50"
                  >
                    <span className="font-medium text-sm">{importing ? 'Importing...' : 'Import vault'}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5-5 5 5M12 15V3" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-4">Security info</label>
                <div className="space-y-0">
                  {[
                    { label: 'Authentication', value: 'WebAuthn / Touch ID' },
                    { label: 'Encryption', value: 'AES-256-GCM' },
                    { label: 'Storage', value: 'Local OPFS' },
                    { label: 'Key derivation', value: 'HKDF SHA-256' }
                  ].map((item) => (
                    <div 
                      key={item.label}
                      className="flex items-center justify-between py-4 border-b border-[var(--border)]"
                    >
                      <span className="text-[var(--text-secondary)]">{item.label}</span>
                      <span className="text-sm text-[var(--text-tertiary)] font-mono">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
