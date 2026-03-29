import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Globe, Lock } from 'lucide-react'
import type { VaultEntry } from '~/utils/types'

function getColorForEntry(title: string): { bg: string; text: string } {
  const colors = [
    { bg: 'rgba(100, 116, 139, 0.12)', text: '#64748b' },
    { bg: 'rgba(120, 113, 108, 0.12)', text: '#787168' },
    { bg: 'rgba(162, 155, 140, 0.12)', text: '#a29b8c' },
    { bg: 'rgba(87, 83, 78, 0.12)', text: '#57534e' },
    { bg: 'rgba(68, 64, 60, 0.12)', text: '#44403c' },
  ]
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function getDomain(url: string | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export function EntryCard({
  entry,
  onEdit,
  onDelete,
  index = 0,
}: {
  entry: VaultEntry
  onEdit?: () => void
  onDelete?: () => void
  index?: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  const initial = entry.title.charAt(0).toUpperCase()
  const color = getColorForEntry(entry.title)
  const domain = getDomain(entry.url)

  const handleCopy = async (text: string, type: 'username' | 'password') => {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    copyTimeoutRef.current = setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div
      className="relative"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="nemo-card cursor-pointer transition-all duration-200"
        style={{
          background: expanded ? 'var(--surface)' : 'var(--void-elevated)',
          borderColor: isHovered || expanded ? 'var(--border-hover)' : 'var(--border)',
          boxShadow: isHovered && !expanded ? 'var(--shadow)' : 'var(--shadow-sm)',
        }}
      >
        {/* Header Row */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Icon */}
          <div
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center font-semibold text-base transition-transform duration-200"
            style={{
              background: color.bg,
              color: color.text,
              borderRadius: 'var(--radius-lg)',
              transform: isHovered ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            {initial}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3
              className="text-[15px] font-semibold truncate tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {entry.title}
            </h3>
            <p
              className="text-[13px] truncate mt-0.5"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {domain || entry.username || 'Credential'}
            </p>
          </div>

          {/* Chevron */}
          <div
            className="flex-shrink-0 transition-transform duration-200"
            style={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              color: 'var(--text-muted)',
            }}
          >
            <ChevronDown size={16} strokeWidth={2} />
          </div>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div
            className="px-4 pb-4 pt-2 animate-fade-in"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <div className="space-y-3">
              {/* Domain */}
              {domain && (
                <div className="flex items-center gap-2">
                  <Globe size={12} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                  <p className="font-mono text-[12px] tracking-wide truncate" style={{ color: 'var(--text-tertiary)' }}>
                    {domain}
                  </p>
                </div>
              )}

              {/* Username */}
              {entry.username && (
                <div
                  className="flex items-center justify-between p-3 rounded-md"
                  style={{ background: 'var(--void)', borderRadius: 'var(--radius-md)' }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wide mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>
                      Username
                    </p>
                    <p className="text-[14px] truncate" style={{ color: 'var(--text-primary)' }}>
                      {entry.username}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCopy(entry.username!, 'username') }}
                    className="flex-shrink-0 ml-3 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide transition-colors rounded"
                    style={{
                      color: copied === 'username' ? 'var(--success)' : 'var(--text-tertiary)',
                      background: copied === 'username' ? 'var(--success-light)' : 'transparent',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {copied === 'username' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}

              {/* Password */}
              {entry.password && (
                <div
                  className="flex items-center justify-between p-3 rounded-md"
                  style={{ background: 'var(--void)', borderRadius: 'var(--radius-md)' }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wide mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>
                      Password
                    </p>
                    <p
                      className="font-mono text-[13px] tracking-wide"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {showPassword ? entry.password : '••••••••••••••'}
                    </p>
                  </div>
                  <div className="flex-shrink-0 ml-3 flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowPassword(!showPassword) }}
                      className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide transition-colors rounded"
                      style={{
                        color: 'var(--text-tertiary)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopy(entry.password!, 'password') }}
                      className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide transition-colors rounded"
                      style={{
                        color: copied === 'password' ? 'var(--success)' : 'var(--text-tertiary)',
                        background: copied === 'password' ? 'var(--success-light)' : 'transparent',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      {copied === 'password' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {/* Notes */}
              {entry.notes && (
                <div
                  className="p-3 rounded-md"
                  style={{ background: 'var(--void)', borderRadius: 'var(--radius-md)' }}
                >
                  <p className="text-[11px] uppercase tracking-wide mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>
                    Notes
                  </p>
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words" style={{ color: 'var(--text-secondary)' }}>
                    {entry.notes}
                  </p>
                </div>
              )}

              {/* Tags */}
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {entry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-medium tracking-wide px-2.5 py-1"
                      style={{
                        background: 'var(--accent-light)',
                        color: 'var(--text-secondary)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit?.() }}
                  className="flex-1 py-2.5 text-[12px] font-medium uppercase tracking-wide transition-all"
                  style={{
                    background: 'var(--void-elevated)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete?.() }}
                  className="flex-1 py-2.5 text-[12px] font-medium uppercase tracking-wide transition-all"
                  style={{
                    background: 'transparent',
                    color: 'var(--danger)',
                    border: '1px solid var(--danger-light)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function EntryList({
  entries,
  onEdit,
  onDelete,
  searchQuery,
}: {
  entries: VaultEntry[]
  onEdit?: (entry: VaultEntry) => void
  onDelete?: (id: string) => void
  searchQuery?: string
}) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <div
          className="w-14 h-14 flex items-center justify-center mb-4"
          style={{
            background: 'var(--void-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <Lock size={22} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
        </div>
        <p className="text-[17px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          {searchQuery ? 'No results found' : 'Your vault is empty'}
        </p>
        <p className="text-[13px] mt-1 text-center" style={{ color: 'var(--text-tertiary)' }}>
          {searchQuery
            ? 'Try adjusting your search terms'
            : 'Add your first password entry to begin'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, index) => (
        <EntryCard
          key={entry.id}
          entry={entry}
          index={index}
          onEdit={onEdit ? () => onEdit(entry) : undefined}
          onDelete={onDelete ? () => onDelete(entry.id) : undefined}
        />
      ))}
    </div>
  )
}
