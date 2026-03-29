/**
 * Copyright 2024-2025 Artem Iagovdik <artyom.yagovdik@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { generateTOTP, type TOTPConfig, type TOTPCode } from '~/utils/totp'

interface TOTPDisplayProps {
  config: TOTPConfig
  onCopy?: (code: string) => void
  compact?: boolean
}

export function TOTPDisplay({ config, onCopy, compact = false }: TOTPDisplayProps) {
  const [code, setCode] = useState<TOTPCode | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [remainingSeconds, setRemainingSeconds] = useState(30)
  const [progress, setProgress] = useState(1)
  const lastGeneratedRef = useRef<number>(0)
  const period = config.period ?? 30

  const updateCode = useCallback(async () => {
    try {
      const newCode = await generateTOTP(config)
      setCode(prev => {
        // Only update if code actually changed
        if (prev?.code !== newCode.code) {
          return newCode
        }
        return prev
      })
      setRemainingSeconds(newCode.remainingSeconds)
      setProgress(newCode.progress)
      setIsLoading(false)
    } catch {
      setIsLoading(false)
    }
  }, [config])

  useEffect(() => {
    // Generate code on mount and when period boundary hits
    const checkAndUpdate = async () => {
      const now = Math.floor(Date.now() / 1000)
      const secondsIntoPeriod = now % period
      const secondsRemaining = period - secondsIntoPeriod
      const currentProgress = secondsRemaining / period

      // Generate new code if we're at a new period
      if (now - lastGeneratedRef.current >= period || lastGeneratedRef.current === 0) {
        lastGeneratedRef.current = now
        await updateCode()
      } else {
        // Just update the countdown
        setRemainingSeconds(secondsRemaining)
        setProgress(currentProgress)
      }
    }

    checkAndUpdate()

    // Update countdown every second, but only regenerate code at period boundary
    const interval = setInterval(checkAndUpdate, 1000)
    return () => clearInterval(interval)
  }, [config, period, updateCode])

  const handleCopy = () => {
    if (code?.code) {
      navigator.clipboard.writeText(code.code)
      onCopy?.(code.code)
    }
  }

  if (isLoading || !code) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        <span className="text-[var(--text-tertiary)]">Loading...</span>
      </div>
    )
  }

  const isExpiringSoon = remainingSeconds < 5

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopy}
          className="font-mono text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          title="Click to copy"
        >
          {code.code}
        </button>
        <div className="relative w-4 h-4">
          <svg className="w-4 h-4 -rotate-90" viewBox="0 0 16 16">
            <circle
              cx="8"
              cy="8"
              r="6"
              fill="none"
              stroke="var(--surface)"
              strokeWidth="2"
            />
            <circle
              cx="8"
              cy="8"
              r="6"
              fill="none"
              stroke={isExpiringSoon ? 'var(--danger)' : 'var(--accent)'}
              strokeWidth="2"
              strokeDasharray={`${2 * Math.PI * 6}`}
              strokeDashoffset={`${2 * Math.PI * 6 * (1 - progress)}`}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--surface)] rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[var(--text-secondary)]">2FA Code</span>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs ${isExpiringSoon ? 'text-[var(--danger)]' : 'text-[var(--text-tertiary)]'}`}>
            {remainingSeconds}s
          </span>
          <div className="relative w-3 h-3">
            <svg className="w-3 h-3 -rotate-90" viewBox="0 0 12 12">
              <circle
                cx="6"
                cy="6"
                r="5"
                fill="none"
                stroke="var(--border)"
                strokeWidth="1.5"
              />
              <circle
                cx="6"
                cy="6"
                r="5"
                fill="none"
                stroke={isExpiringSoon ? 'var(--danger)' : 'var(--accent)'}
                strokeWidth="1.5"
                strokeDasharray={`${2 * Math.PI * 5}`}
                strokeDashoffset={`${2 * Math.PI * 5 * (1 - progress)}`}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
          </div>
        </div>
      </div>
      <button
        onClick={handleCopy}
        className="w-full group"
        title="Click to copy"
      >
        <div className="flex items-center justify-center gap-2 py-2 px-3 bg-[var(--void)] rounded border border-[var(--border)] group-hover:border-[var(--accent)] transition-colors">
          <span className="font-mono text-2xl font-semibold text-[var(--text-primary)] tracking-wider">
            {code.code}
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-colors"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </div>
      </button>
    </div>
  )
}
