/**
 * Copyright 2024-2026 Artem Iagovdik <artyom.yagovdik@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react'
import type { VaultEntry } from '~/utils/types'

function getColorForEntry(title: string): { bg: string; text: string } {
  const colors = [
    { bg: 'rgba(184, 115, 51, 0.12)', text: '#b87333' },
    { bg: 'rgba(100, 116, 139, 0.12)', text: '#64748b' },
    { bg: 'rgba(201, 162, 39, 0.12)', text: '#c9a227' },
    { bg: 'rgba(139, 92, 246, 0.12)', text: '#8b5cf6' },
    { bg: 'rgba(34, 197, 94, 0.12)', text: '#22c55e' },
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
      className="relative animate-entry-reveal"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Main card */}
      <div
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative cursor-pointer transition-all duration-300"
        style={{
          background: expanded ? 'var(--surface-card)' : 'transparent',
          border: `1px solid ${isHovered || expanded ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
          boxShadow: isHovered && !expanded ? '0 4px 20px rgba(0,0,0,0.2)' : 'none'
        }}
      >
        {/* Card header */}
        <div className="flex items-center gap-4 px-5 py-4">
          {/* Avatar */}
          <div 
            className="flex-shrink-0 w-11 h-11 flex items-center justify-center font-display text-[18px] transition-transform duration-300"
            style={{ 
              background: color.bg,
              color: color.text,
              borderRadius: '50%',
              transform: isHovered ? 'scale(1.05)' : 'scale(1)'
            }}
          >
            {initial}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 
              className="font-display text-[15px] font-medium truncate tracking-tight transition-colors"
              style={{ color: isHovered ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            >
              {entry.title}
            </h3>            
            <p 
              className="font-body text-[13px] truncate mt-0.5 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              {domain || entry.username || 'Credential'}
            </p>          </div>

          {/* Expand chevron */}
          <div
            className="flex-shrink-0 transition-transform duration-300"
            style={{ 
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              color: 'var(--text-muted)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div 
            className="px-5 pb-5 animate-expand"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <div className="pt-4 space-y-4">
              {/* Domain / URL */}
              {domain && (
                <div className="flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  <p className="font-mono text-[11px] tracking-wide truncate" style={{ color: 'var(--text-faint)' }}>
                    {domain}
                  </p>                </div>
              )}

              {/* Username field */}
              {entry.username && (
                <div 
                  className="flex items-center justify-between p-3"
                  style={{ background: 'var(--surface-void-light)' }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[9px] tracking-[0.15em] uppercase mb-1" style={{ color: 'var(--text-faint)' }}>
                      Username
                    </p>
                    <p className="font-body text-[14px] truncate" style={{ color: 'var(--text-primary)' }}>
                      {entry.username}
                    </p>                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCopy(entry.username!, 'username') }}
                    className="flex-shrink-0 ml-4 px-3 py-1.5 font-mono text-[9px] tracking-[0.1em] uppercase transition-colors hover:text-[var(--text-primary)]"
                    style={{ color: copied === 'username' ? 'var(--success)' : 'var(--text-muted)' }}
                  >
                    {copied === 'username' ? 'Copied' : 'Copy'}
                  </button>                </div>
              )}

              {/* Password field */}
              {entry.password && (
                <div 
                  className="flex items-center justify-between p-3"
                  style={{ background: 'var(--surface-void-light)' }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[9px] tracking-[0.15em] uppercase mb-1" style={{ color: 'var(--text-faint)' }}>
                      Password
                    </p>
                    <p 
                      className="font-mono text-[13px] tracking-wide"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {showPassword ? entry.password : '••••••••••••••'}
                    </p>                  </div>
                  <div className="flex-shrink-0 ml-4 flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowPassword(!showPassword) }}
                      className="px-3 py-1.5 font-mono text-[9px] tracking-[0.1em] uppercase transition-colors hover:text-[var(--text-primary)]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopy(entry.password!, 'password') }}
                      className="px-3 py-1.5 font-mono text-[9px] tracking-[0.1em] uppercase transition-colors hover:text-[var(--text-primary)]"
                      style={{ color: copied === 'password' ? 'var(--success)' : 'var(--text-muted)' }}
                    >
                      {copied === 'password' ? 'Copied' : 'Copy'}
                    </button>                  </div>                </div>
              )}

              {/* Notes */}
              {entry.notes && (
                <div 
                  className="p-3"
                  style={{ background: 'var(--surface-void-light)' }}
                >
                  <p className="font-mono text-[9px] tracking-[0.15em] uppercase mb-1" style={{ color: 'var(--text-faint)' }}>
                    Notes
                  </p>
                  <p className="font-body text-[13px] leading-relaxed whitespace-pre-wrap break-words" style={{ color: 'var(--text-secondary)' }}>
                    {entry.notes}
                  </p>                </div>
              )}

              {/* Tags */}
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map((tag) => (
                    <span 
                      key={tag}
                      className="font-mono text-[9px] tracking-[0.1em] uppercase px-2.5 py-1"
                      style={{ 
                        background: 'var(--bronze-glow)',
                        color: 'var(--bronze)'
                      }}
                    >
                      {tag}
                    </span>                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit?.() }}
                  className="flex-1 py-2.5 font-mono text-[10px] tracking-[0.1em] uppercase transition-all"
                  style={{ 
                    background: 'var(--surface-elevated)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  Edit
                </button>                <button
                  onClick={(e) => { e.stopPropagation(); onDelete?.() }}
                  className="flex-1 py-2.5 font-mono text-[10px] tracking-[0.1em] uppercase transition-all"
                  style={{ 
                    background: 'transparent',
                    color: 'var(--danger)',
                    border: '1px solid var(--danger-dim)'
                  }}
                >
                  Delete
                </button>              </div>            </div>          </div>        )}
      </div>    </div>  )
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
      <div className="flex flex-col items-center justify-center py-16 px-6 animate-fade">
        <div 
          className="w-16 h-16 flex items-center justify-center mb-6"
          style={{ 
            background: 'var(--surface-void-light)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '50%'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1.5">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M7 11V7C7 4.24 9.24 2 12 2C14.76 2 17 4.24 17 7V11" />
          </svg>        </div>
        <p className="font-display text-[18px] font-medium" style={{ color: 'var(--text-primary)' }}>
          {searchQuery ? 'No results found' : 'Your vault is empty'}
        </p>        <p className="font-body text-[14px] mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
          {searchQuery 
            ? 'Try adjusting your search terms' 
            : 'Add your first password entry to begin'}
        </p>      </div>    )
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
        />      ))}
    </div>  )
}
