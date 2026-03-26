import { useState } from 'react'
import { Spinner } from './ui'

interface LockedViewProps {
  onUnlock: () => Promise<void>
  onCreate: () => Promise<void>
}

export function LockedView({ onUnlock, onCreate }: LockedViewProps) {
  const [loading, setLoading] = useState<'unlock' | 'create' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState(false)

  const handleUnlock = async () => {
    setLoading('unlock')
    setUnlocking(true)
    setError(null)
    try {
      await onUnlock()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock')
      setUnlocking(false)
    } finally {
      setLoading(null)
    }
  }

  const handleCreate = async () => {
    setLoading('create')
    setError(null)
    try {
      await onCreate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vault')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div
      className="w-[380px] h-[520px] bg-base flex flex-col relative"
      style={{
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        opacity: unlocking ? 0 : 1,
        transform: unlocking ? 'scale(0.96)' : 'scale(1)'
      }}
    >
      <div className="flex-1 flex flex-col px-8 py-10">
        <header className="mb-10 animate-fade-in">
          <span className="text-[13px] font-medium text-fg-muted tracking-wider uppercase mb-2 block">
            NEMO
          </span>
          <h1 className="text-[22px] font-light text-fg-primary tracking-tight">
            Enter your passkey
          </h1>
        </header>

        <main className="flex flex-col gap-6 animate-slide-up">
          {error && (
            <div className="p-3 rounded-lg bg-danger/8 border border-danger/15">
              <p className="text-[12px] text-danger leading-relaxed">{error}</p>
            </div>
          )}

          <button
            onClick={handleUnlock}
            disabled={loading !== null}
            className="w-full py-[15px] rounded-lg bg-fg-primary text-base-surface font-medium text-[14px] tracking-wide transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
          >
            {loading === 'unlock' ? (
              <div className="flex items-center justify-center">
                <Spinner size="sm" />
              </div>
            ) : 'Unlock Vault'}
          </button>

          <button
            onClick={handleCreate}
            disabled={loading !== null}
            className="flex items-center gap-2.5 text-[13px] text-fg-secondary hover:text-fg-primary transition-colors duration-200 py-1 disabled:opacity-30"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="6" width="18" height="12" rx="2"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            Use biometrics
          </button>

          <div className="flex gap-2 mt-2">
            <button
              onClick={handleCreate}
              disabled={loading !== null}
              className="flex-1 py-3.5 rounded-lg text-[13px] text-fg-muted hover:text-fg-secondary transition-colors disabled:opacity-30"
            >
              Create New
            </button>
            <span className="text-fg-faint">·</span>
            <button
              disabled={loading !== null}
              className="flex-1 py-3.5 rounded-lg text-[13px] text-fg-muted hover:text-fg-secondary transition-colors disabled:opacity-30"
            >
              Import
            </button>
          </div>
        </main>
      </div>

      <footer className="px-8 py-6 border-t border-glass-border">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-fg-faint font-mono">v2.4.7</span>
          <button className="text-[11px] text-fg-muted hover:text-fg-secondary transition-colors">
            Recover access
          </button>
        </div>
      </footer>
    </div>
  )
}
