

import { useState } from "react"

interface VaultEntry {
  id: string
  title: string
  username?: string
  password?: string
  url?: string
  notes?: string
}

interface TacticalEntryModalProps {
  entry: VaultEntry
  onClose: () => void
  onCopy: (text: string) => void
  onEdit: (entry: VaultEntry) => void
  onDelete: (id: string) => void
}

export default function TacticalEntryModal({
  entry,
  onClose,
  onCopy,
  onEdit,
  onDelete
}: TacticalEntryModalProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setNotification({ type: "success", message: `${label} COPIED` })
      setTimeout(() => setNotification(null), 1500)
    } catch {
      setNotification({ type: "error", message: "COPY FAILED" })
      setTimeout(() => setNotification(null), 1500)
    }
  }

  const handleDelete = () => {
    if (confirm("CONFIRM DELETE THIS ENTRY?")) {
      onDelete(entry.id)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/90">
      <div className="scanline-overlay" />

      <div className="nemo-popup hud-card chamfered max-h-[90vh] overflow-hidden">
        <div className="scan-line" />

        <div className="hud-header">
          <h2 className="hud-title text-secondary">{entry.title}</h2>
          <button onClick={onClose} className="text-muted hover:text-primary transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto scrollbar-tactical" style={{ maxHeight: "calc(100% - 120px)" }}>
          {entry.url && (
            <div className="hud-card chamfered-sm p-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs text-muted block mb-1">URL</label>
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:text-success transition-colors"
                  >
                    {entry.url}
                  </a>
                </div>
                <button
                  onClick={() => handleCopy(entry.url!, "URL")}
                  className="p-1.5 text-muted hover:text-secondary transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {entry.username && (
            <div className="hud-card chamfered-sm p-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs text-muted block mb-1">USERNAME</label>
                  <p className="text-sm text-primary">{entry.username}</p>
                </div>
                <button
                  onClick={() => handleCopy(entry.username!, "USERNAME")}
                  className="p-1.5 text-muted hover:text-secondary transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {entry.password && (
            <div className="hud-card chamfered-sm p-3 border-success/30">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="text-xs text-muted block mb-1">PASSWORD</label>
                  <p className="text-sm text-primary font-mono">
                    {showPassword ? entry.password : "•••••••••••••"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 text-muted hover:text-secondary transition-colors"
                    title={showPassword ? "Hide" : "Show"}
                  >
                    {showPassword ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleCopy(entry.password!, "PASSWORD")}
                    className="p-1.5 text-muted hover:text-success transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {entry.notes && (
            <div className="hud-card chamfered-sm p-3">
              <label className="text-xs text-muted block mb-1">NOTES</label>
              <p className="text-sm text-secondary whitespace-pre-wrap">{entry.notes}</p>
            </div>
          )}

          <div className="divider-tactical" />

          <div className="flex gap-2">
            <button
              onClick={() => onEdit(entry)}
              className="tactical-button chamfered flex-1"
            >
              EDIT
            </button>
            <button
              onClick={handleDelete}
              className="tactical-button tactical-button-destructive chamfered flex-1"
            >
              DELETE
            </button>
          </div>
        </div>

        {notification && (
          <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 chamfered-sm ${
            notification.type === "success" ? "bg-elevated border-success" : "bg-elevated border-destructive"
          }`}>
            <span className={`text-xs ${notification.type === "success" ? "text-success" : "text-destructive"}`}>
              {notification.message}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
