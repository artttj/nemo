import { useState } from 'react'
import type { VaultEntry } from '~/utils/types'
import { getFaviconUrl } from '~/utils/vault'

const ICON_COLORS = [
  'from-violet-500/20 to-violet-600/10 text-violet-400',
  'from-blue-500/20 to-blue-600/10 text-blue-400',
  'from-emerald-500/20 to-emerald-600/10 text-emerald-400',
  'from-rose-500/20 to-rose-600/10 text-rose-400',
  'from-amber-500/20 to-amber-600/10 text-amber-400',
  'from-cyan-500/20 to-cyan-600/10 text-cyan-400',
  'from-pink-500/20 to-pink-600/10 text-pink-400',
  'from-orange-500/20 to-orange-600/10 text-orange-400',
]

function getColorForEntry(title: string): string {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length]
}

export function EntryCard({
  entry,
  onEdit,
  onDelete,
  onCopyUsername,
  onCopyPassword
}: {
  entry: VaultEntry
  onEdit?: () => void
  onDelete?: () => void
  onCopyUsername?: () => void
  onCopyPassword?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const favicon = entry.url ? getFaviconUrl(entry.url) : null
  const initial = entry.title.charAt(0).toUpperCase()
  const colorClass = getColorForEntry(entry.title)

  const handleCopy = async (text: string, type: 'username' | 'password') => {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full text-left card card-interactive ${expanded ? 'rounded-b-none border-b-transparent' : ''}`}
      >
        <div className="flex items-center gap-3.5">
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center overflow-hidden`}>
            {favicon ? (
              <img src={favicon} alt="" className="w-5 h-5" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <span className="text-[14px] font-semibold">{initial}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] font-medium text-fg-primary truncate leading-tight">{entry.title}</h3>
            <p className="text-[12px] text-fg-muted truncate mt-0.5">
              {entry.username || entry.notes?.substring(0, 40) || (entry.password ? 'Secret' : 'Note')}
            </p>
          </div>

          {entry.favorite && (
            <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
          )}

          <svg
            className={`w-4 h-4 text-fg-faint transition-transform ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 16 16"
            fill="none"
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-2 bg-glass-surface border border-t-0 border-glass-border rounded-b-[10px] animate-fade-in">
          <div className="space-y-2.5">
            {entry.url && (
              <p className="text-[11px] font-mono text-fg-muted truncate px-1">
                {(() => { try { return new URL(entry.url).hostname.replace(/^www\./, '') } catch { return entry.url } })()}
              </p>
            )}

            {entry.username && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-base/40">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-fg-muted mb-0.5">Username</p>
                  <code className="text-[13px] text-fg-primary font-mono truncate block">{entry.username}</code>
                </div>
                <button
                  onClick={() => onCopyUsername?.() || handleCopy(entry.username!, 'username')}
                  className="ml-3 px-3 py-1.5 text-[11px] font-medium text-fg-muted hover:text-fg-primary rounded-md hover:bg-glass-shine transition-all"
                >
                  Copy
                </button>
              </div>
            )}

            {entry.password && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-base/40">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-fg-muted mb-0.5">Password</p>
                  <code className="text-[13px] text-fg-primary font-mono">
                    {showPassword ? entry.password : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                  </code>
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-2.5 py-1.5 text-[11px] font-medium text-fg-muted hover:text-fg-secondary rounded-md hover:bg-glass-shine transition-all"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => onCopyPassword?.() || handleCopy(entry.password!, 'password')}
                    className="px-2.5 py-1.5 text-[11px] font-medium text-fg-muted hover:text-fg-primary rounded-md hover:bg-glass-shine transition-all"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            {entry.notes && (
              <div className="p-3 rounded-lg bg-base/40">
                <p className="text-[10px] text-fg-muted mb-1">Notes</p>
                <p className="text-[13px] text-fg-secondary leading-relaxed whitespace-pre-wrap break-words">{entry.notes}</p>
              </div>
            )}

            {entry.tags && entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-1 pt-1">
                {entry.tags.map((tag) => (
                  <span key={tag} className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-accent-muted text-accent-hover border border-accent/10">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={onEdit}
                className="flex-1 py-2.5 text-[12px] font-medium text-fg-secondary hover:text-fg-primary rounded-xl transition-all border border-glass-border hover:border-glass-border-hover hover:bg-glass-surface"
              >
                Edit
              </button>
              <button
                onClick={onDelete}
                className="flex-1 py-2.5 text-[12px] font-medium text-fg-muted hover:text-danger rounded-xl transition-all border border-glass-border hover:border-danger/20 hover:bg-danger/5"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {copied && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 animate-slide-up z-10">
          <div className="bg-fg-primary text-base-surface px-4 py-2 text-[11px] font-medium rounded-full shadow-lg shadow-black/40">
            {copied === 'username' ? 'Username' : 'Password'} copied
          </div>
        </div>
      )}
    </div>
  )
}

export function EntryList({
  entries,
  onEdit,
  onDelete,
  searchQuery
}: {
  entries: VaultEntry[]
  onEdit?: (entry: VaultEntry) => void
  onDelete?: (id: string) => void
  searchQuery?: string
}) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-fg-muted">
            <path d="M12 2C8.13 2 5 5.13 5 9V11H4C2.9 11 2 11.9 2 13V21C2 22.1 2.9 23 4 23H20C21.1 23 22 22.1 22 21V13C22 11.9 21.1 11 20 11H19V9C19 5.13 15.87 2 12 2ZM8 9C8 6.79 9.79 5 12 5C14.21 5 16 6.79 16 9V11H8V9Z" fill="currentColor" opacity="0.3" />
          </svg>
        </div>
        <p className="text-[15px] text-fg-secondary font-medium">
          {searchQuery ? 'No matching entries' : 'Your vault is empty'}
        </p>
        {!searchQuery && (
          <p className="text-[13px] text-fg-muted mt-1.5">Add your first credential</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, index) => (
        <div key={entry.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.03}s` }}>
          <EntryCard
            entry={entry}
            onEdit={onEdit ? () => onEdit(entry) : undefined}
            onDelete={onDelete ? () => onDelete(entry.id) : undefined}
          />
        </div>
      ))}
    </div>
  )
}
