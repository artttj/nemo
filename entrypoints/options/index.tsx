

import { useState } from 'react'
import '~/style.css'
import { Button } from '~/components/ui'

function Options() {
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await chrome.runtime.sendMessage({ type: 'EXPORT_VAULT' })
      if (response.success) {
        const blob = new Blob([response.data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `nemo-vault-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
        setMessage({ type: 'success', text: 'Vault exported successfully.' })
      } else {
        setMessage({ type: 'error', text: response.error || 'Export failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export vault' })
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const text = await file.text()
      const response = await chrome.runtime.sendMessage({
        type: 'IMPORT_VAULT',
        payload: text
      })
      if (response.success) {
        setMessage({ type: 'success', text: 'Vault imported successfully.' })
      } else {
        setMessage({ type: 'error', text: response.error || 'Import failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to import vault' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className='min-h-screen bg-base noise-overlay'>
      <div className='relative z-10 max-w-lg mx-auto px-8 py-16'>
        <div className='text-center mb-12'>
          <div className='w-14 h-14 mx-auto mb-5 border border-accent/20 bg-accent/5 rounded-lg flex items-center justify-center'>
            <svg className='w-6 h-6 text-accent' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={1.5}
                d='M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z'
              />
            </svg>
          </div>
          <h1 className='text-2xl font-display font-semibold text-fg-primary mb-2'>Nemo Settings</h1>
          <p className='text-[12px] text-fg-muted tracking-wide'>Manage your private vault</p>
        </div>

        {message && (
          <div
            className={`mb-8 p-4 rounded text-[12px] animate-fade-in-up ${
              message.type === 'success'
                ? 'bg-accent/8 border border-accent/15 text-accent'
                : 'bg-danger/8 border border-danger/15 text-danger'
            }`}>
            <div className='flex items-center justify-between'>
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)} className='p-1 hover:bg-fg-faint/10 rounded transition-colors'>
                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className='card mb-4'>
          <h2 className='text-[9px] font-medium text-fg-faint uppercase tracking-[0.12em] mb-3'>Backup & Restore</h2>
          <p className='text-[12px] text-fg-muted mb-5 leading-relaxed'>
            Export an encrypted backup of your vault or restore from a previous backup. Data is protected with AES-256-GCM encryption.
          </p>
          <div className='flex gap-3'>
            <Button variant='ghost' onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export Vault'}
            </Button>
            <label className='flex items-center cursor-pointer'>
              <Button variant='ghost' disabled={importing}>
                {importing ? 'Importing...' : 'Import Backup'}
              </Button>
              <input
                type='file'
                accept='.json'
                onChange={handleImport}
                className='hidden'
                disabled={importing}
              />
            </label>
          </div>
        </div>

        <div className='card mb-4'>
          <h2 className='text-[9px] font-medium text-fg-faint uppercase tracking-[0.12em] mb-4'>Security</h2>
          <div className='space-y-2'>
            {[
              { label: 'Passkey Authentication', detail: 'Biometric authentication enabled', color: 'accent' },
              { label: 'Encryption', detail: 'AES-256-GCM with PBKDF2', color: 'accent' },
              { label: 'Local Storage', detail: 'Origin Private File System', color: 'secondary' }
            ].map((item) => (
              <div key={item.label} className='flex items-center justify-between p-3 surface-muted'>
                <div>
                  <p className='text-[12px] font-medium text-fg-primary'>{item.label}</p>
                  <p className='text-[10px] text-fg-muted mt-0.5'>{item.detail}</p>
                </div>
                <div className={`w-1.5 h-1.5 rounded-full bg-${item.color}`} />
              </div>
            ))}
          </div>
        </div>

        <div className='card mb-4'>
          <h2 className='text-[9px] font-medium text-fg-faint uppercase tracking-[0.12em] mb-4'>Privacy</h2>
          <p className='text-[12px] text-fg-muted mb-5 leading-relaxed'>
            Nemo is a local-first password manager. Your data never leaves your device. All encryption and decryption happens in your browser using the Web Crypto API.
          </p>
          <div className='space-y-1.5'>
            {['No cloud storage', 'No account required', 'Zero-knowledge encryption'].map((item) => (
              <div key={item} className='flex items-center gap-2.5 p-2.5 surface-muted'>
                <div className='w-1 h-1 rounded-full bg-accent' />
                <span className='text-[11px] text-fg-secondary'>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className='gold-line my-8' />

        <div className='text-center text-fg-faint'>
          <p className='text-[10px] uppercase tracking-[0.15em]'>Nemo v0.0.1</p>
          <p className='text-[10px] mt-1 tracking-wide'>Local-first private vault</p>
        </div>
      </div>
    </div>
  )
}

export default Options
