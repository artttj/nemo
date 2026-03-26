import type { VaultEntry } from '~/utils/types'
import { useState, useEffect } from 'react'
import { Modal, Button, Input, PasswordInput } from './ui'

type EntryType = 'login' | 'note' | 'secret'

export function AddEditModal({
  isOpen,
  onClose,
  onSave,
  entry
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>) => void
  entry?: VaultEntry
}) {
  const [entryType, setEntryType] = useState<EntryType>('login')
  const [title, setTitle] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (entry) {
      setTitle(entry.title)
      setUsername(entry.username || '')
      setPassword(entry.password || '')
      setUrl(entry.url || '')
      setNotes(entry.notes || '')

      if (entry.notes && !entry.username && !entry.password) {
        setEntryType('note')
      } else if (entry.password && !entry.username) {
        setEntryType('secret')
      } else {
        setEntryType('login')
      }
    } else {
      setTitle('')
      setUsername('')
      setPassword('')
      setUrl('')
      setNotes('')
      setEntryType('login')
    }
  }, [entry, isOpen])

  const handleSave = () => {
    if (!title.trim()) return

    const data: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'> = {
      title: title.trim()
    }

    if (username.trim()) data.username = username.trim()
    if (password) data.password = password
    if (url.trim()) data.url = url.trim()
    if (notes.trim()) data.notes = notes.trim()

    onSave(data)
    onClose()
  }

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
    let result = ''
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPassword(result)
  }

  const isValid = title.trim().length > 0

  const types: { key: EntryType; label: string }[] = [
    { key: 'login', label: 'Login' },
    { key: 'note', label: 'Note' },
    { key: 'secret', label: 'Secret' }
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={entry ? 'Edit Entry' : 'New Entry'}>
      <div className="space-y-5">
        {!entry && (
          <div className="flex gap-2">
            {types.map((t) => (
              <button
                key={t.key}
                onClick={() => setEntryType(t.key)}
                className={`flex-1 py-2.5 text-[12px] font-medium rounded-md transition-all ${
                  entryType === t.key
                    ? 'bg-fg-primary text-base-surface'
                    : 'glass text-fg-muted hover:text-fg-secondary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              entryType === 'login' ? 'GitHub, AWS Console...' :
              entryType === 'note' ? 'API docs, recovery codes...' :
              'SSH key, API token...'
            }
            autoFocus
          />

          {(entryType === 'login') && (
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="email@example.com"
            />
          )}

          {(entryType === 'login' || entryType === 'secret') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[12px] font-medium text-fg-muted">
                  {entryType === 'secret' ? 'Secret Value' : 'Password'}
                </label>
                <button
                  onClick={generatePassword}
                  className="text-[12px] font-medium text-accent hover:text-accent-hover transition-colors"
                >
                  Generate
                </button>
              </div>
              <PasswordInput value={password} onChange={setPassword} />
            </div>
          )}

          {(entryType === 'note' || entryType === 'secret') && (
            <div>
              <label className="block text-[12px] font-medium text-fg-muted mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Your private notes..."
                rows={4}
                className="input-field resize-none text-[13px] leading-relaxed"
              />
            </div>
          )}

          {entryType === 'login' && (
            <Input
              label="Website URL"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com (optional)"
            />
          )}
        </div>

        <div className="divider" />

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!isValid}
            className="flex-1"
          >
            {entry ? 'Save' : 'Add'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
