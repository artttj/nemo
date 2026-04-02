

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { RefreshCw, ChevronDown, Loader2, Lock, Check, Database, Cloud, Trash2, AlertCircle, ChevronRight, ArrowLeft, Download, Upload, Info, Folder, Edit, X } from 'lucide-react'
import type { VaultSettings, VaultRegistry } from '~/utils/types'

interface CloudflareConfig {
  accountId: string
  databaseId: string
  apiToken: string
  syncOnChange: boolean
}

interface SyncStatusData {
  status: 'idle' | 'syncing' | 'error' | 'success'
  lastSyncAt?: number
  error?: string
  pendingChanges: boolean
  enabled: boolean
  authToken?: string
  baseUrl?: string
}

function RecoveryPhraseSection() {
  const [status, setStatus] = useState<{
    lastVerifiedAt?: number
    needsReminder: boolean
    loading: boolean
  }>({ needsReminder: false, loading: true })
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [verifyPhrase, setVerifyPhrase] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [verifySuccess, setVerifySuccess] = useState(false)

  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    const response = await chrome.runtime.sendMessage({ type: 'GET_RECOVERY_STATUS' })
    if (response.success) {
      setStatus({
        lastVerifiedAt: response.data.lastVerifiedAt,
        needsReminder: response.data.needsReminder,
        loading: false
      })
    }
  }

  const handleVerify = async () => {
    setVerifyError('')
    const response = await chrome.runtime.sendMessage({
      type: 'VERIFY_RECOVERY_PHRASE',
      payload: verifyPhrase
    })
    if (response.success) {
      await chrome.runtime.sendMessage({ type: 'UPDATE_RECOVERY_VERIFIED' })
      setVerifySuccess(true)
      await loadStatus()
      setTimeout(() => {
        setShowVerifyModal(false)
        setVerifyPhrase('')
        setVerifySuccess(false)
      }, 1500)
    } else {
      setVerifyError(response.error || 'Invalid recovery phrase')
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString()
  }

  if (status.loading) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Lock size={14} style={{ color: 'var(--text-secondary)' }} />
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Recovery Phrase</h3>
      </div>

      <div className="ml-[22px]">
        {status.needsReminder ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--danger)]">Not verified</span>
            <button
              onClick={() => setShowVerifyModal(true)}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              Verify now
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Check size={14} style={{ color: 'var(--success)' }} />
            <span className="text-xs text-[var(--text-secondary)]">
              Last verified: {status.lastVerifiedAt ? formatDate(status.lastVerifiedAt) : 'Never'}
            </span>
          </div>
        )}
      </div>

      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-[var(--void-elevated)] rounded-xl border border-[var(--border)] p-4">
            <h4 className="text-[15px] font-semibold text-[var(--text-primary)] mb-2">Verify Recovery Phrase</h4>
            <p className="text-[13px] text-[var(--text-secondary)] mb-4">
              Enter your 12-word recovery phrase to confirm you have it stored safely.
            </p>

            {verifySuccess ? (
              <div className="flex items-center justify-center gap-2 py-4 text-[var(--success)]">
                <Check size={20} />
                <span className="font-medium">Verified successfully</span>
              </div>
            ) : (
              <>
                <textarea
                  value={verifyPhrase}
                  onChange={(e) => setVerifyPhrase(e.target.value)}
                  placeholder="Enter your 12 words..."
                  className="w-full h-24 bg-[var(--surface)] text-[var(--text-primary)] text-[13px] rounded-lg px-3 py-2 border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none transition-colors resize-none mb-3"
                />

                {verifyError && (
                  <p className="text-[13px] text-[var(--danger)] mb-3">{verifyError}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowVerifyModal(false)}
                    className="flex-1 py-2 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerify}
                    disabled={!verifyPhrase.trim()}
                    className="flex-1 py-2 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    Verify
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

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
  onDeleteVault,
  onExportNemx
}: {
  isOpen: boolean
  onClose: () => void
  settings: VaultSettings | null
  onExport: (format?: 'csv') => Promise<void>
  onImport: (data: string) => Promise<void>
  onSettingsChange: (settings: Partial<VaultSettings>) => void
  hasPinSetup: boolean
  onPinSetup: (pin: string) => Promise<{ success: boolean; error?: string }>
  onPinRemove: () => Promise<{ success: boolean; error?: string }>
  vaultRegistry?: VaultRegistry | null
  currentVaultId?: string | null
  onRenameVault?: (vaultId: string, name: string) => Promise<{ success: boolean; error?: string }>
  onDeleteVault?: (vaultId: string) => Promise<{ success: boolean; error?: string }>
  onExportNemx?: () => Promise<void>
}) {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [activeSection, setActiveSection] = useState<'security' | 'backup' | 'vaults' | 'sync'>('security')
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

  const [syncStatus, setSyncStatus] = useState<SyncStatusData | null>(null)
  const [cloudflareConfig, setCloudflareConfig] = useState<CloudflareConfig>({
    accountId: '',
    databaseId: '',
    apiToken: '',
    syncOnChange: true
  })
  const [testingConnection, setTestingConnection] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [acknowledgeOptIn, setAcknowledgeOptIn] = useState(false)

  const [showSyncToken, setShowSyncToken] = useState(false)
  const [showImportToken, setShowImportToken] = useState(false)
  const [showAutoLock, setShowAutoLock] = useState(false)

  const currentAutoLock = settings?.autoLockMinutes ?? 15

  const autoLockOptions = [
    { value: 1, label: '1 min', hint: 'Most secure' },
    { value: 5, label: '5 min', hint: '' },
    { value: 15, label: '15 min', hint: '' },
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
      setShowSyncToken(false)
      setShowImportToken(false)
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

  useEffect(() => {
    if (isOpen && activeSection === 'sync') {
      loadSyncStatus()
    }
  }, [isOpen, activeSection])

  const loadSyncStatus = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CUSTOM_BACKEND_SYNC_STATUS' })
      if (response.success) {
        setSyncStatus(response.data)
        if (response.data.authToken) {
          setCloudflareConfig(prev => ({
            ...prev,
            apiToken: response.data.authToken
          }))
        }
      }
    } catch {
      setSyncStatus(null)
    }
  }

  const handleEnableSync = async () => {
    setTestingConnection(true)
    try {
      
      const hasExistingToken = cloudflareConfig.apiToken.length > 20

      const response = await chrome.runtime.sendMessage({
        type: 'ENABLE_CUSTOM_BACKEND_SYNC',
        payload: {
          baseUrl: '', 
          syncOnChange: true
        }
      })

      if (response.success) {
        showFeedback(hasExistingToken ? 'Sync enabled' : 'Anonymous sync enabled')
        await loadSyncStatus()
      } else {
        showFeedback(response.error || 'Failed to enable sync')
      }
    } finally {
      setTestingConnection(false)
    }
  }

  const handleDisableSync = async () => {
    const response = await chrome.runtime.sendMessage({ type: 'DISABLE_CUSTOM_BACKEND_SYNC' })
    if (response.success) {
      showFeedback('Sync disabled')
      setSyncStatus(null)
      setCloudflareConfig({
        accountId: '',
        databaseId: '',
        apiToken: '',
        syncOnChange: true
      })
    }
  }

  const handleTriggerSync = async () => {
    setSyncing(true)
    try {
      const response = await chrome.runtime.sendMessage({ type: 'TRIGGER_CUSTOM_BACKEND_SYNC' })
      if (response.success) {
        showFeedback('Sync completed')
        await loadSyncStatus()
      } else {
        showFeedback(response.error || 'Sync failed')
      }
    } finally {
      setSyncing(false)
    }
  }

  const formatLastSync = (timestamp?: number): string => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const showFeedback = useCallback((msg: string) => {
    setFeedback(msg)
    clearTimeout(feedbackTimeoutRef.current)
    feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), 2500)
  }, [])

  const handleExport = async (format?: 'csv') => {
    setExporting(true)
    try {
      await onExport(format)
      showFeedback('Vault exported')
    } finally { setExporting(false) }
  }

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.nemx,.csv,.json'
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
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex-1" />
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">Settings</span>
          <div className="flex-1" />
          <div className="w-[52px]" />
        </div>

        {feedback && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-[var(--success-light)] border border-[rgba(22,163,74,0.15)] flex items-center gap-2 animate-fade-in">
            <Check size={14} style={{ color: 'var(--success)' }} />
            <span className="text-[12px] font-medium text-[var(--success)]">{feedback}</span>
          </div>
        )}

        <div className="flex mx-4 mt-3 p-1 bg-[var(--surface)] rounded-lg">
          {(['security', 'backup', 'vaults', 'sync'] as const).map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`flex-1 py-2 text-[13px] font-medium rounded-md transition-all relative ${
                activeSection === section
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {section === 'security' ? 'Security' : section === 'backup' ? 'Backup' : section === 'vaults' ? 'Vaults' : 'Sync'}
              {activeSection === section && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--accent)] rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {activeSection === 'security' && (
            <div className="space-y-3 animate-fade-in">
              <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Auto-lock</h3>
                  <span className="text-[13px] font-medium text-[var(--accent)]">
                    {autoLockOptions.find(o => o.value === currentAutoLock)?.label}
                  </span>
                </div>
                <p className="text-[12px] text-[var(--text-secondary)] mb-3">
                  Lock your vault after inactivity
                </p>
                <div className="flex flex-wrap gap-2">
                  {autoLockOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleAutoLockChange(opt.value)}
                      className={`px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all ${
                        currentAutoLock === opt.value
                          ? 'bg-[var(--accent)] text-[var(--void)]'
                          : 'bg-[var(--void-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">PIN Code</h3>
                <p className="text-[12px] text-[var(--text-secondary)] mb-3">
                  Use a PIN for faster unlock. Biometrics still available.
                </p>

                {pinStep === 'idle' && !hasPinSetup && (
                  <button
                    onClick={() => setPinStep('enter')}
                    className="w-full py-2.5 text-[13px] font-medium bg-[var(--accent)] text-[var(--void)] rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Set up PIN
                  </button>
                )}

                {pinStep === 'idle' && hasPinSetup && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check size={14} style={{ color: 'var(--success)' }} />
                      <span className="text-[13px] text-[var(--text-primary)]">PIN enabled</span>
                    </div>
                    <button
                      onClick={() => setShowRemovePinConfirm(true)}
                      className="text-[12px] text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {pinStep !== 'idle' && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                      {pinStep === 'enter' ? 'Enter new PIN' : 'Confirm PIN'}
                    </label>
                    <input
                      type="text"
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
                      className="w-full bg-transparent text-[var(--void)] text-[20px] font-mono tracking-[0.3em] text-center border-none outline-none placeholder:text-[var(--text-muted)] placeholder:text-[14px] placeholder:tracking-normal"
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
                )}
              </div>

              <div className="h-px bg-[var(--border)]" />

              <div>
                <button
                  onClick={() => setShowSecurityInfo(!showSecurityInfo)}
                  className="w-full flex items-center justify-between py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <span className="text-[13px] font-medium">How your data is protected</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${showSecurityInfo ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--text-muted)' }}
                  />
                </button>
                {showSecurityInfo && (
                  <div className="mt-2 rounded-lg border border-[var(--border)] overflow-hidden">
                    {[
                      { label: 'Authentication', value: 'WebAuthn / Touch ID' },
                      { label: 'Encryption', value: 'AES-256-GCM' },
                      { label: 'Storage', value: 'Local OPFS' },
                      { label: 'Key derivation', value: 'HKDF SHA-256' },
                    ].map((item, i) => (
                      <div
                        key={item.label}
                        className={`px-3 py-2 ${i < 3 ? 'border-b border-[var(--border)]' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-[var(--text-secondary)]">{item.label}</span>
                          <span className="text-[11px] text-[var(--text-primary)] font-mono">{item.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'backup' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Download size={14} style={{ color: 'var(--text-secondary)' }} />
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Export</h3>
                </div>
                <p className="text-[var(--text-tertiary)] text-[12px] mb-3 ml-[22px]">
                  Download your vault data in a portable format.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={async () => {
                      setExporting(true)
                      try {
                        await onExportNemx?.()
                        showFeedback('NEMX exported')
                      } finally {
                        setExporting(false)
                      }
                    }}
                    disabled={exporting}
                    className="w-full flex items-center justify-between px-3 py-3.5 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors disabled:opacity-50"
                  >
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                        {exporting ? 'Exporting...' : 'NEMX format'}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)]">
                        Native Nemo export (recommended for backup)
                      </span>
                    </div>
                    <Download size={14} style={{ color: 'var(--text-muted)' }} />
                  </button>
                  <button
                    onClick={async () => {
                      setExporting(true)
                      try {
                        await onExport('csv')
                        showFeedback('CSV exported')
                      } finally {
                        setExporting(false)
                      }
                    }}
                    disabled={exporting}
                    className="w-full flex items-center justify-between px-3 py-3.5 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors disabled:opacity-50"
                  >
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                        {exporting ? 'Exporting...' : 'CSV format'}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)]">
                        Compatible with Bitwarden, 1Password, LastPass
                      </span>
                    </div>
                    <Download size={14} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
              </div>

              <div className="h-px bg-[var(--border)]" />

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Upload size={14} style={{ color: 'var(--text-secondary)' }} />
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
                  <Upload size={14} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>

              <div className="h-px bg-[var(--border)]" />

              <div className="px-3 py-3 rounded-lg bg-[var(--surface)]">
                <div className="flex items-start gap-2">
                  <Info size={14} style={{ color: 'var(--text-muted)' }} className="mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                    NEMX is the native Nemo export format. CSV can be imported to other password managers like Bitwarden or 1Password.
                  </p>
                </div>
              </div>

              <div className="h-px bg-[var(--border)]" />

              <RecoveryPhraseSection />
            </div>
          )}

          {activeSection === 'vaults' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Folder size={14} style={{ color: 'var(--text-secondary)' }} />
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
                        <Edit size={16} />
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
                      <Folder size={14} style={{ color: 'var(--text-secondary)' }} />
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
                  <Trash2 size={14} style={{ color: 'var(--danger)' }} />
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
                  <ChevronRight size={14} />
                </button>
                {vaultRegistry?.vaults.length === 1 && (
                  <p className="text-[11px] text-[var(--text-muted)] mt-2">
                    You cannot delete your only vault. Create another vault first.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeSection === 'sync' && (
            <div className="space-y-8 animate-fade-in">
              {syncStatus?.enabled ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                      <span className="text-[14px] font-medium text-[var(--text-primary)]">Sync is on</span>
                    </div>
                    <span className="text-[12px] text-[var(--text-muted)]">
                      {syncStatus.lastSyncAt ? `Last: ${formatLastSync(syncStatus.lastSyncAt)}` : 'Not synced yet'}
                    </span>
                  </div>

                  <div className="px-3 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                    <div className="flex items-center gap-2 mb-1">
                      <Cloud size={12} className="text-[var(--text-tertiary)]" />
                      <span className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] font-medium">Sync Server</span>
                    </div>
                    <p className="text-[13px] text-[var(--text-secondary)]">
                      Anonymous Cloudflare D1 worker
                    </p>
                  </div>

                  <button
                    onClick={handleTriggerSync}
                    disabled={syncing}
                    className="w-full py-3.5 bg-[var(--accent)] text-[var(--accent-text)] rounded-xl text-[14px] font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="animate-spin" size={14} />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} />
                        Sync now
                      </>
                    )}
                  </button>

                  {syncStatus.status === 'error' && syncStatus.error && (
                    <div className="px-3 py-2.5 rounded-lg bg-[var(--danger-light)] border border-[rgba(220,38,38,0.12)]">
                      <p className="text-[12px] text-[var(--danger)]">{syncStatus.error}</p>
                    </div>
                  )}

                  <div className="h-px bg-[var(--border)]" />

                  <div>
                    <button
                      onClick={() => setShowSyncToken(!showSyncToken)}
                      className="w-full flex items-center justify-between py-2 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <span>Sync another device</span>
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${showSyncToken ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {showSyncToken && (
                      <div className="mt-2 space-y-2">
                        <p className="text-[11px] text-[var(--text-tertiary)]">Copy this token to your other device to sync.</p>
                        <div className="flex gap-2">
                          <div className="flex-1 bg-[var(--surface)] text-[var(--text-secondary)] text-[11px] font-mono rounded-lg px-3 py-2.5 border border-[var(--border)] truncate">
                            {syncStatus.authToken || '••••••••••••••••'}
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(syncStatus.authToken || '')
                              showFeedback('Token copied')
                            }}
                            className="px-3 py-2.5 border border-[var(--border)] text-[var(--text-secondary)] rounded-lg text-[12px] hover:bg-[var(--surface)] transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={handleDisableSync}
                      className="text-[13px] text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
                    >
                      Disable sync
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h3 className="text-[14px] font-medium text-[var(--text-primary)] mb-1">Anonymous Sync</h3>
                    <p className="text-[12px] text-[var(--text-tertiary)]">No account. No email. No tracking.</p>
                  </div>

                  <div className="px-3 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      <strong className="text-[var(--text-primary)]">Anonymous Sync.</strong> Your encrypted vault syncs to a Cloudflare D1 database.
                      By enabling sync, you acknowledge that you are responsible for your own credentials, data, and any charges.
                      This project is not liable for data loss, breaches, or third-party costs.
                    </p>
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acknowledgeOptIn}
                      onChange={(e) => setAcknowledgeOptIn(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                    />
                    <span className="text-[12px] text-[var(--text-secondary)]">
                      I understand that sync is optional and I am responsible for my own data
                    </span>
                  </label>

                  <button
                    onClick={handleEnableSync}
                    disabled={testingConnection || !acknowledgeOptIn}
                    className="w-full py-3.5 bg-[var(--accent)] text-[var(--accent-text)] rounded-xl text-[14px] font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {testingConnection ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Creating token...
                      </>
                    ) : (
                      'Enable sync'
                    )}
                  </button>

                  <div className="h-px bg-[var(--border)]" />

                  <div>
                    <button
                      onClick={() => setShowImportToken(!showImportToken)}
                      className="w-full flex items-center justify-between py-2 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <span>Already have a token?</span>
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${showImportToken ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {showImportToken && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={cloudflareConfig.apiToken}
                          onChange={(e) => setCloudflareConfig(prev => ({ ...prev, apiToken: e.target.value }))}
                          placeholder="Paste your sync token"
                          className="flex-1 bg-[var(--surface)] text-[var(--text-primary)] text-[13px] rounded-lg px-3 py-2.5 border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none transition-colors"
                        />
                        <button
                          onClick={handleEnableSync}
                          disabled={!cloudflareConfig.apiToken}
                          className="px-4 py-2.5 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          Import
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
