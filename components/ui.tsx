import { useState } from 'react'

interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  onClick?: () => void
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  children,
  variant = 'primary',
  onClick,
  disabled,
  className = '',
  size = 'md'
}: ButtonProps) {
  const sizes = {
    sm: 'px-4 py-2.5 text-[12px]',
    md: 'px-6 py-3.5 text-[13px]',
    lg: 'px-8 py-4 text-[14px]'
  }

  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-secondary text-danger border-danger/15 hover:bg-danger/8 hover:border-danger/25'
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

interface InputProps {
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
  label?: string
}

export function Input({
  type = 'text',
  value,
  onChange,
  placeholder,
  className = '',
  autoFocus,
  label
}: InputProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-[12px] font-medium text-fg-muted mb-2">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="input-field"
      />
    </div>
  )
}

interface PasswordInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

export function PasswordInput({ value, onChange, label }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div>
      {label && (
        <label className="block text-[12px] font-medium text-fg-muted mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-field pr-16 text-fg-primary font-mono text-[14px]"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-medium text-fg-muted hover:text-fg-secondary rounded-md hover:bg-glass-surface transition-colors"
        >
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  )
}

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-muted" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search in all items..."
        className="input-field pl-11 text-[14px]"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md bg-fg-faint/50 flex items-center justify-center hover:bg-fg-faint transition-colors"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  )
}

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
}

export function Spinner({ size = 'md' }: SpinnerProps) {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <div className={`${sizes[size]} relative animate-spin`}>
      <div className="absolute inset-0 border-2 border-fg-faint/20 rounded-full" />
      <div className="absolute inset-0 border-2 border-transparent border-t-accent rounded-full" />
    </div>
  )
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />
      <div className="relative bg-base-surface w-full max-w-[380px] rounded-t-xl border border-b-0 border-glass-border animate-slide-up shadow-glass">
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-[17px] font-display font-semibold text-fg-primary">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-glass-surface flex items-center justify-center hover:bg-glass-shine transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="h-px bg-glass-border" />
        <div className="p-6 max-h-[65vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

export function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'accent' | 'secondary' | 'danger' }) {
  const variants = {
    default: 'bg-glass-surface text-fg-secondary border-glass-border',
    accent: 'bg-accent-muted text-accent-hover border-accent/15',
    secondary: 'bg-glass-surface text-fg-secondary border-glass-border',
    danger: 'bg-danger/8 text-danger border-danger/15'
  }

  return (
    <span className={`${variants[variant]} inline-flex items-center px-3 py-1 text-[11px] font-medium tracking-wide rounded-lg border`}>
      {children}
    </span>
  )
}
