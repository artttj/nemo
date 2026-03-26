import { useState } from "react"
import type { VaultSettings } from "~/utils/types"
import { Modal, Button } from "./ui"

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

  const handleExport = async () => {
    setExporting(true)
    try {
      await onExport()
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setImporting(true)
      try {
        const text = await file.text()
        await onImport(text)
        onClose()
      } finally {
        setImporting(false)
      }
    }
    input.click()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="space-y-6">
        <div>
          <h3 className="text-[12px] font-medium text-fg-muted mb-3">Auto-Lock Timer</h3>
          <div className="flex gap-2">
            {[1, 5, 15, 30, 60].map((mins) => (
              <button
                key={mins}
                onClick={() => onSettingsChange({ autoLockMinutes: mins })}
                className={`flex-1 py-3 text-[13px] font-medium rounded-lg transition-all ${
                  (settings?.autoLockMinutes ?? 5) === mins
                    ? "bg-fg-primary text-base-surface shadow-sm"
                    : "glass text-fg-secondary hover:text-fg-primary"
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        <div className="divider" />

        <div>
          <h3 className="text-[12px] font-medium text-fg-muted mb-3">Backup</h3>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleExport} disabled={exporting} className="flex-1">
              {exporting ? "Exporting..." : "Export"}
            </Button>
            <Button variant="secondary" onClick={handleImport} disabled={importing} className="flex-1">
              {importing ? "Importing..." : "Import"}
            </Button>
          </div>
        </div>

        <div className="divider" />

        <div>
          <h3 className="text-[12px] font-medium text-fg-muted mb-3">Security</h3>
          <div className="space-y-2">
            {[
              { name: 'Biometric Auth', detail: 'Touch ID / Face ID', icon: '01' },
              { name: 'AES-256-GCM', detail: 'End-to-end encryption', icon: '02' },
              { name: 'Local Storage', detail: 'OPFS on-device', icon: '03' }
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between p-3.5 rounded-lg glass">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-success/10 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-md bg-success" />
                  </div>
                  <div>
                    <p className="text-[13px] text-fg-primary font-medium">{item.name}</p>
                    <p className="text-[11px] text-fg-muted">{item.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
