import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { VaultSettings, VaultRegistry } from '~/utils/types'

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onExport,
  onImport,
  onSettingsChange,
  hasPinSetup,
  onPinSetup,
  onPinRemove,
  vaultRegistry,
  currentVaultId,
  onRenameVault,
  onDeleteVault
}: {
  isOpen: boolean
  onClose: () => void
  settings: VaultSettings | null
  onExport: () => Promise<void>
  onImport: (data: string) => Promise<void>
  onSettingsChange: (settings: Partial<VaultSettings>) => void
  hasPinSetup: boolean
  onPinSetup: (pin: string) => Promise<{ success: boolean; error?: string }>
  onPinRemove: () => Promise<{ success: boolean; error?: string }>
  vaultRegistry?: VaultRegistry | null
  currentVaultId?: string | null
  onRenameVault?: (vaultId: string, name: string) => Promise<{ success: boolean; error?: string }>
  onDeleteVault?: (vaultId: string) => Promise<{ success: boolean; error?: string }>
}) {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [activeSection, setActiveSection] = useState<'security' | 'backup' | 'vaults'>('security')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [pinStep, setPinStep] = useState<'idle' | 'enter' | 'confirm'>('idle')
  const [pinValue, setPinValue] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [settingUpPin, setSettingUpPin] = useState(false)
  const [showRemovePinConfirm, setShowRemovePinConfirm] = useState(false)
  const [editingVaultName, setEditingVaultName] = useState(false)
  const [vaultNameInput, setVaultNameInput] = useState('')
  const [showDeleteVaultConfirm, setShowDeleteVaultConfirm] = useState(false)
  const [vaultActionLoading, setVaultActionLoading] = useState(false)
  const [showSecurityInfo, setShowSecurityInfo] = useState(false)
  const feedbackTimeoutRef = useRef<NodeJS.Timeout>()

  const currentAutoLock = settings?.autoLockMinutes ?? 15

  const autoLockOptions = [
    { value: 1, label: '1 min', hint: 'Most secure' },
    { value: 5, label: '5 min', hint: '' },
    { value: 15, label: '15 min', hint: 'Recommended' },
    { value: 30, label: '30 min', hint: '' },
    { value: 60, label: '1 hour', hint: 'Less secure' },
  ]

  const currentVault = useMemo(() =>
    vaultRegistry?.vaults.find(v => v.id === currentVaultId),
    [vaultRegistry?.vaults, currentVaultId]
  )
  const otherVaults = useMemo(() =>
    vaultRegistry?.vaults.filter(v => v.id !== currentVaultId) ?? [],
    [vaultRegistry?.vaults, currentVaultId]
  )

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      return
    }
    const timer = setTimeout(() => setIsVisible(false), 300)
    return () => clearTimeout(timer)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setPinStep('idle')
      setPinValue('')
      setPinConfirm('')
      setPinError(null)
      setShowRemovePinConfirm(false)
      setEditingVaultName(false)
      setVaultNameInput('')
      setShowDeleteVaultConfirm(false)
      setShowSecurityInfo(false)
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      clearTimeout(feedbackTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (editingVaultName && currentVault) {
      setVaultNameInput(currentVault.name)
    }
  }, [editingVaultName, currentVault])

  const showFeedback = useCallback((msg: string) => {
    setFeedback(msg)
    clearTimeout(feedbackTimeoutRef.current)
    feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), 2500)
  }, [])

  const handleExport = async () => {
    setExporting(true)
    try {
      await onExport()
      showFeedback('Vault exported')
    } finally { setExporting(false) }
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
        showFeedback('Vault imported')
        onClose()
      } finally { setImporting(false) }
    }
    input.click()
  }

  const handleAutoLockChange = (mins: number) => {
    onSettingsChange({ autoLockMinutes: mins })
    showFeedback(`Auto-lock set to ${mins} min`)
  }

  const handlePinSubmit = async () => {
    if (pinStep === 'enter') {
      if (pinValue.length < 4) {
        setPinError('PIN must be at least 4 digits')
        return
      }
      setPinError(null)
      setPinStep('confirm')
      return
    }
    if (pinStep === 'confirm') {
      if (pinConfirm !== pinValue) {
        setPinError('PINs do not match')
        setPinConfirm('')
        return
      }
      setSettingUpPin(true)
      setPinError(null)
      try {
        const result = await onPinSetup(pinValue)
        if (result.success) {
          showFeedback('PIN code enabled')
          setPinStep('idle')
          setPinValue('')
          setPinConfirm('')
        } else {
          setPinError(result.error || 'Failed to set up PIN')
        }
      } finally {
        setSettingUpPin(false)
      }
    }
  }

  const handleRemovePin = async () => {
    const result = await onPinRemove()
    if (result.success) {
      showFeedback('PIN code removed')
      setShowRemovePinConfirm(false)
    }
  }

  const handleRenameVault = async () => {
    if (!onRenameVault || !currentVaultId || !vaultNameInput.trim()) return
    setVaultActionLoading(true)
    try {
      const result = await onRenameVault(currentVaultId, vaultNameInput.trim())
      if (result.success) {
        showFeedback('Vault renamed')
        setEditingVaultName(false)
      } else {
        showFeedback(result.error || 'Failed to rename vault')
      }
    } finally {
      setVaultActionLoading(false)
    }
  }

  const handleDeleteVault = async () => {
    if (!onDeleteVault || !currentVaultId) return
    setVaultActionLoading(true)
    try {
      const result = await onDeleteVault(currentVaultId)
      if (result.success) {
        setShowDeleteVaultConfirm(false)
        onClose()
      } else {
        showFeedback(result.error || 'Failed to delete vault')
      }
    } finally {
      setVaultActionLoading(false)
    }
  }

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {showRemovePinConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowRemovePinConfirm(false)} />
          <div className="relative bg-[var(--void)] rounded-xl p-5 max-w-sm w-full border border-[var(--border)] shadow-xl">
            <h3 className="text-base font-semibold text-[var(--text-primary)] text-center mb-1">Remove PIN code?</h3>
            <p className="text-[var(--text-secondary)] text-sm text-center mb-4">
              You won't be able to unlock with a PIN until you set one up again.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRemovePinConfirm(false)}
                className="flex-1 py-3 px-3 border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--surface)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemovePin}
                className="flex-1 py-3 px-3 bg-[var(--danger)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteVaultConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteVaultConfirm(false)} />
          <div className="relative bg-[var(--void)] rounded-xl p-5 max-w-sm w-full border border-[var(--border)] shadow-xl">
            <h3 className="text-base font-semibold text-[var(--text-primary)] text-center mb-1">Delete vault?</h3>
            <p className="text-[var(--text-secondary)] text-sm text-center mb-4">
              This will permanently delete <strong>{currentVault?.name}</strong> and all {currentVault?.entryCount ?? 0} passwords. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteVaultConfirm(false)}
                className="flex-1 py-3 px-3 border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--surface)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteVault}
                disabled={vaultActionLoading}
                className="flex-1 py-3 px-3 bg-[var(--danger)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {vaultActionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className={`absolute right-0 top-0 h-full w-[400px] bg-[var(--void)] nemo-slide-panel flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="flex-1" />
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">Settings</span>
          <div className="flex-1" />
          <div className="w-[52px]" />
        </div>

        {feedback && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-[var(--success-light)] border border-[rgba(22,163,74,0.15)] flex items-center gap-2 animate-fade-in">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-[12px] font-medium text-[var(--success)]">{feedback}</span>
          </div>
        )}

        <div className="flex mx-4 mt-3 p-1 bg-[var(--surface)] rounded-lg">
          {(['security', 'backup', 'vaults'] as const).map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`flex-1 py-2.5 text-[13px] font-medium rounded-md transition-all ${
                activeSection === section
                  ? 'bg-[var(--void-elevated)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {section === 'security' ? 'Security' : section === 'backup' ? 'Backup' : 'Vaults'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {activeSection === 'security' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Auto-lock</h3>
                </div>
                <p className="text-[var(--text-tertiary)] text-[12px] mb-3 ml-[22px]">
                  Lock your vault after inactivity.
                </p>
                <div className="space-y-1">
                  {autoLockOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleAutoLockChange(opt.value)}
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-[13px] transition-colors ${
                        currentAutoLock === opt.value
                          ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface)]'
                      }`}
                    >
                      <span className="font-medium">{opt.label}</span>
                      <span className={`text-[11px] ${
                        currentAutoLock === opt.value ? 'text-[var(--accent-text)] opacity-70' : 'text-[var(--text-muted)]'
                      }`}>
                        {currentAutoLock === opt.value && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" className="inline mr-1">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        {opt.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-[var(--border)]" />

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">PIN code</h3>
                </div>
                <p className="text-[var(--text-tertiary)] text-[12px] mb-3 ml-[22px]">
                  Quick unlock with a numeric PIN. Biometric auth remains available.
                </p>

                {pinStep === 'idle' && !hasPinSetup && (
                  <button
                    onClick={() => setPinStep('enter')}
                    className="w-full flex items-center justify-between px-3 py-3.5 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors cursor-pointer"
                  >
                    <span className="text-[13px] font-medium text-[var(--text-secondary)]">Set up PIN code</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                )}

                {pinStep === 'idle' && hasPinSetup && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-3 py-3.5 rounded-lg bg-[var(--success-light)] border border-[rgba(22,163,74,0.12)]">
                      <div className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span className="text-[13px] font-medium text-[var(--text-primary)]">PIN code enabled</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowRemovePinConfirm(true)}
                      className="w-full px-3 py-3 rounded-lg text-[12px] font-medium text-[var(--danger)] hover:bg-[var(--danger-light)] transition-colors"
                    >
                      Remove PIN
                    </button>
                  </div>
                )}

                {pinStep !== 'idle' && (
                  <div className="space-y-3">
                    <div className="px-3 py-4 rounded-lg border border-[var(--border)] bg-[var(--void-elevated)]">
                      <label className="block text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                        {pinStep === 'enter' ? 'Enter new PIN' : 'Confirm PIN'}
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={8}
                        value={pinStep === 'enter' ? pinValue : pinConfirm}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '')
                          if (pinStep === 'enter') setPinValue(val)
                          else setPinConfirm(val)
                          setPinError(null)
                        }}
                        placeholder="4-8 digits"
                        autoFocus
                        className="w-full bg-transparent text-[var(--text-primary)] text-[20px] font-mono tracking-[0.3em] text-center border-none outline-none placeholder:text-[var(--text-muted)] placeholder:text-[14px] placeholder:tracking-normal"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handlePinSubmit()
                          if (e.key === 'Escape') {
                            setPinStep('idle')
                            setPinValue('')
                            setPinConfirm('')
                            setPinError(null)
                          }
                        }}
                      />
                      <div className="flex justify-center mt-3 gap-1">
                        {pinStep === 'enter' && Array.from({ length: pinValue.length }).map((_, i) => (
                          <div key={`pin-enter-${i}`} className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                        ))}
                        {pinStep === 'confirm' && Array.from({ length: pinConfirm.length }).map((_, i) => (
                          <div key={`pin-confirm-${i}`} className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                        ))}
                      </div>
                      {pinError && (
                        <p className="text-[12px] text-[var(--danger)] px-1 mt-2">{pinError}</p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => {
                            setPinStep('idle')
                            setPinValue('')
                            setPinConfirm('')
                            setPinError(null)
                          }}
                          className="flex-1 py-3 px-3 border border-[var(--border)] rounded-lg text-[var(--text-secondary)] text-[13px] font-medium hover:bg-[var(--surface)] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handlePinSubmit}
                          disabled={settingUpPin || (pinStep === 'enter' ? pinValue.length < 4 : pinConfirm.length < 4)}
                          className="flex-1 py-3 px-3 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg text-[13px] font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                        >
                          {settingUpPin ? 'Setting up...' : pinStep === 'enter' ? 'Next' : 'Confirm'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="h-px bg-[var(--border)]" />

                <div>
                  <button
                    onClick={() => setShowSecurityInfo(!showSecurityInfo)}
                    className="w-full flex items-center justify-between py-3 hover:bg-[var(--surface)] rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">How your data is protected</h3>
                    </div>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--text-muted)"
                      stroke-width="2"
                      className={`transition-transform ${showSecurityInfo ? 'rotate-180' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {showSecurityInfo && (
                    <div className="mt-3 space-y-0 rounded-lg border border-[var(--border)] overflow-hidden">
                      {[
                        { label: 'Authentication', value: 'WebAuthn / Touch ID', desc: 'Hardware-backed biometric auth' },
                        { label: 'Encryption', value: 'AES-256-GCM', desc: 'Military-grade encryption standard' },
                        { label: 'Storage', value: 'Local OPFS', desc: 'Data never leaves your device' },
                        { label: 'Key derivation', value: 'HKDF SHA-256', desc: 'Cryptographic key strengthening' }
                      ].map((item, i) => (
                        <div
                          key={item.label}
                          className={`px-3 py-2.5 ${i < 3 ? 'border-b border-[var(--border)]' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] text-[var(--text-secondary)]">{item.label}</span>
                            <span className="text-[11px] text-[var(--text-primary)] font-mono font-medium">{item.value}</span>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'backup' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Export</h3>
                </div>
                <p className="text-[var(--text-tertiary)] text-[12px] mb-3 ml-[22px]">
                  Download an encrypted copy of your vault for backup or migration.
                </p>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="w-full flex items-center justify-between px-3 py-3.5 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors disabled:opacity-50"
                >
                  <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                    {exporting ? 'Exporting...' : 'Download vault backup'}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                </button>
              </div>

              <div className="h-px bg-[var(--border)]" />

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Import</h3>
                </div>
                <p className="text-[var(--text-tertiary)] text-[12px] mb-3 ml-[22px]">
                  Restore from a previously exported vault file.
                </p>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="w-full flex items-center justify-between px-3 py-3.5 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors disabled:opacity-50"
                >
                  <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                    {importing ? 'Importing...' : 'Upload vault file'}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5-5 5 5M12 15V3" />
                  </svg>
                </button>
              </div>

              <div className="h-px bg-[var(--border)]" />

              <div className="px-3 py-3 rounded-lg bg-[var(--surface)]">
                <div className="flex items-start gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" className="mt-0.5 flex-shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                    Backups include all entries and settings. They are encrypted with your vault key and can only be restored on devices where you can authenticate.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'vaults' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18" />
                  </svg>
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Current vault</h3>
                </div>

                <div className="mt-3 space-y-3">
                  {editingVaultName ? (
                    <div className="px-3 py-3 rounded-lg border border-[var(--border)] bg-[var(--void-elevated)]">
                      <label className="block text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                        Vault name
                      </label>
                      <input
                        type="text"
                        value={vaultNameInput}
                        onChange={(e) => setVaultNameInput(e.target.value)}
                        placeholder="Enter vault name"
                        autoFocus
                        className="w-full bg-transparent text-[var(--text-primary)] text-[15px] border-none outline-none placeholder:text-[var(--text-muted)]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameVault()
                          if (e.key === 'Escape') {
                            setEditingVaultName(false)
                            setVaultNameInput('')
                          }
                        }}
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => {
                            setEditingVaultName(false)
                            setVaultNameInput('')
                          }}
                          className="flex-1 py-2 px-3 border border-[var(--border)] rounded-lg text-[var(--text-secondary)] text-[13px] font-medium hover:bg-[var(--surface)] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleRenameVault}
                          disabled={vaultActionLoading || !vaultNameInput.trim() || vaultNameInput.trim() === currentVault?.name}
                          className="flex-1 py-2 px-3 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {vaultActionLoading ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-3 py-3 rounded-lg border border-[var(--border)]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
                          <span className="text-[14px] font-bold text-[var(--accent-text)]">
                            {currentVault?.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[14px] font-medium text-[var(--text-primary)] block">
                            {currentVault?.name}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)]">
                            {currentVault?.entryCount ?? 0} passwords
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingVaultName(true)}
                        className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] rounded-lg transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {otherVaults.length > 0 && (
                <>
                  <div className="h-px bg-[var(--border)]" />
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M3 9h18" />
                      </svg>
                      <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Other vaults</h3>
                    </div>
                    <div className="space-y-1">
                      {otherVaults.map((vault) => (
                        <div
                          key={vault.id}
                          className="flex items-center justify-between px-3 py-3 rounded-lg bg-[var(--surface)]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
                              <span className="text-[14px] font-medium text-[var(--text-secondary)]">
                                {vault.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <span className="text-[14px] font-medium text-[var(--text-primary)] block">
                                {vault.name}
                              </span>
                              <span className="text-[11px] text-[var(--text-muted)]">
                                {vault.entryCount} passwords
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="h-px bg-[var(--border)]" />

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <h3 className="text-[13px] font-semibold text-[var(--danger)]">Danger zone</h3>
                </div>
                <p className="text-[var(--text-tertiary)] text-[12px] mb-3 ml-[22px]">
                  Deleting a vault is permanent. All passwords will be lost.
                </p>
                <button
                  onClick={() => setShowDeleteVaultConfirm(true)}
                  disabled={vaultRegistry?.vaults.length === 1}
                  className="w-full flex items-center justify-between px-3 py-3.5 rounded-lg border border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-[13px] font-medium">
                    Delete this vault
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
                {vaultRegistry?.vaults.length === 1 && (
                  <p className="text-[11px] text-[var(--text-muted)] mt-2">
                    You cannot delete your only vault. Create another vault first.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
