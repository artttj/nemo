/**
 * Copyright 2024-2025 Artem Iagovdik <artyom.yagovdik@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react'

interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'ghost'
  onClick?: () => void
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

export function Button({ children, variant = 'primary', onClick, disabled, className = '', style }: ButtonProps) {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      style={{
        padding: '12px',
        fontSize: '11px',
        fontWeight: 500,
        color: variant === 'primary' ? 'var(--bg)' : 'var(--text-secondary)',
        background: variant === 'primary' ? 'var(--text)' : 'transparent',
        border: variant === 'primary' ? 'none' : '1px solid var(--border)',
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...style
      }}
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

export function Input({ type = 'text', value, onChange, placeholder, autoFocus, label }: InputProps) {
  return (
    <div>
      {label && (
        <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.04em' }}>
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{
          width: '100%',
          padding: '8px 0',
          fontSize: '13px',
          color: 'var(--text)',
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid var(--border)',
          outline: 'none'
        }}
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
        <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.04em' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 40px 8px 0',
            fontSize: '13px',
            color: 'var(--text)',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--border)',
            outline: 'none'
          }}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          style={{
            position: 'absolute',
            right: '0',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '9px',
            color: 'var(--text-muted)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {showPassword ? 'HIDE' : 'SHOW'}
        </button>
      </div>
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
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.9)'
    }} onClick={onClose}>
      <div 
        style={{
          width: '100%',
          maxWidth: '380px',
          background: 'var(--bg)',
          borderTop: '1px solid var(--border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ 
          padding: '12px 16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)'
        }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{title}</span>
          <button onClick={onClose} style={{ fontSize: '14px', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '16px', maxHeight: '60vh', overflow: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
