

import { useState } from "react"
import { X, Copy, Eye, EyeOff } from "lucide-react"

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
            <X size={16} />
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
                  <Copy size={14} />
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
                  <Copy size={14} />
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
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    onClick={() => handleCopy(entry.password!, "PASSWORD")}
                    className="p-1.5 text-muted hover:text-success transition-colors"
                  >
                    <Copy size={14} />
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
