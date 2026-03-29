# AGENTS.md

Guidelines for AI agents working on this codebase.

## Project Overview

Nemo is a local-first password manager browser extension with passkey authentication. It uses WebAuthn for biometric unlock, AES-256-GCM encryption, and stores data in the Origin Private File System (OPFS).

## Build Commands

```bash
# Development
pnpm dev              # Start dev server (Chrome)
pnpm dev:firefox      # Start dev server (Firefox)

# Build
pnpm build            # Production build for Chrome
pnpm build:firefox     # Production build for Firefox

# Type checking
pnpm compile          # TypeScript type check (no emit)

# Package
pnpm zip              # Create .zip for Chrome Web Store
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Extension (WXT)                   │
├────────────────┬────────────────┬───────────────────────────┤
│    Popup       │   Background   │       Content Script       │
│   (React)      │  (Service       │   (Password Detection)    │
│                │   Worker)       │                           │
├────────────────┴────────────────┴───────────────────────────┤
│                     Core Libraries                           │
├─────────────────┬────────────────┬─────────────────────────┤
│    utils/       │     vault/     │    entrypoints/          │
│  (Legacy/        │   (New Arch)   │   offscreen/             │
│   Core)         │                │   webauthn/              │
├─────────────────┴────────────────┴─────────────────────────┤
│                     Storage Layer                            │
│             OPFS (Encrypted Vault Data)                      │
│         chrome.storage (Credentials, Settings)               │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
nemo/
├── entrypoints/
│   ├── popup/              # Popup UI (React app)
│   │   ├── App.tsx         # Main popup component
│   │   └── main.tsx        # Entry point
│   ├── background.ts       # Service worker / message router
│   ├── content.ts          # Content script (password field detection)
│   ├── options/            # Extension options page
│   ├── offscreen/          # Offscreen documents for WebAuthn
│   └── webauthn/           # WebAuthn flow pages
│
├── components/             # React components
│   ├── locked-view.tsx     # Lock screen (unlock UI)
│   ├── add-edit-modal.tsx  # Add/edit entry modal
│   ├── entry-detail-modal.tsx
│   ├── settings-modal.tsx
│   └── ui.tsx              # Shared UI primitives
│
├── utils/                  # Core utilities (legacy)
│   ├── vault-ops.ts        # Vault operations (create/unlock/lock)
│   ├── vault.ts            # OPFS storage operations
│   ├── crypto.ts           # AES-256-GCM, PBKDF2 utilities
│   ├── auth.ts             # WebAuthn credential management
│   ├── webauthn-handler.ts # WebAuthn promise handling
│   └── types.ts            # TypeScript definitions
│
├── vault/                  # New vault architecture
│   ├── vault.ts            # Vault class (data model)
│   ├── manager.ts          # Vault orchestration
│   ├── crypto.ts           # Encryption utilities
│   ├── storage.ts          # Storage abstraction
│   ├── recovery.ts         # BIP-39 recovery phrases
│   ├── pin.ts              # PIN unlock functionality
│   ├── types.ts            # Vault-specific types
│   └── index.ts            # Public API
│
├── style.css               # Global styles (CSS variables)
├── tailwind.config.js      # Tailwind configuration
└── wxt.config.ts           # WXT extension config
```

## Key Files

| File | Purpose |
|------|---------|
| `entrypoints/background.ts` | Service worker, message router (all state mutations go through here) |
| `entrypoints/popup/App.tsx` | Main popup UI, vault list, entry management |
| `components/locked-view.tsx` | Lock screen UI (biometric/password unlock) |
| `utils/vault-ops.ts` | Core vault operations (create, unlock, lock, CRUD) |
| `utils/vault.ts` | OPFS read/write operations |
| `utils/auth.ts` | WebAuthn credential registration/authentication |
| `vault/recovery.ts` | BIP-39 recovery phrase generation/decoding |
| `vault/crypto.ts` | Encryption/key derivation utilities |

## Patterns & Conventions

### Message Passing

All state changes go through the background service worker via `chrome.runtime.sendMessage`:

```typescript
// Popup sends message
const response = await chrome.runtime.sendMessage({ 
  type: 'UNLOCK_VAULT' 
})

// Background handler
case 'UNLOCK_VAULT':
  return unlockVault()
```

### State Management

State is held in memory in the background service worker:

```typescript
// vault-ops.ts
let vaultState: VaultState = {
  isUnlocked: false,
  vault: null,
  metadata: null,
  lastActivity: Date.now()
}
let sessionKey: CryptoKey | null = null
```

The popup reads state via `GET_VAULT_STATE` message.

### Storage

- **OPFS**: Encrypted vault data (`nemo-vault/vault.enc`, `nemo-vault/metadata.json`)
- **chrome.storage.local**: WebAuthn credential ID, PRF salt, PIN data

### React Components

Use functional components with hooks. Styling via Tailwind CSS classes with CSS variables:

```tsx
<button className="nemo-button-primary py-3">
  Unlock vault
</button>
```

### CSS Variables

Primary theme colors defined in `style.css`:

```css
--void: #FAFAFA;           /* Background */
--gold: #C98700;           /* Primary accent */
--text-primary: #1A1A1A;   /* Primary text */
--border: rgba(0,0,0,0.08);/* Borders */
```

Use semantic class names:
- `.nemo-button-primary` - Primary action button
- `.nemo-button-secondary` - Secondary button
- `.nemo-input` - Form input field
- `.nemo-card` - Card container
- `.nemo-pill` - Filter/tag pill

## Vault Operations

### Create Vault

```typescript
// User registers WebAuthn credential
// PRF output derived to create wrapping key
// Vault key encrypted and stored
// Empty vault initialized in OPFS
```

### Unlock Vault

```typescript
// User authenticates with WebAuthn
// PRF output used to derive decryption key
// Vault key decrypted, held in memory
// Vault data loaded from OPFS
```

### Lock Vault

```typescript
// Session key cleared from memory
// Vault state reset to locked
```

### Recovery

```typescript
// 12-word BIP-39 phrase
// Used to derive recovery key
// Can decrypt backup or create new vault
```

## Adding New Features

### New Message Type

1. Add type to `utils/types.ts` `Message` union
2. Add handler in `entrypoints/background.ts` `handleMessage` switch
3. Implement handler in `utils/vault-ops.ts`
4. Call from popup via `chrome.runtime.sendMessage({ type: 'YOUR_TYPE' })`

### New UI Component

1. Create in `components/`
2. Import in `entrypoints/popup/App.tsx`
3. Use Tailwind classes with CSS variables

### New Vault Operation

1. Add function to `utils/vault-ops.ts`
2. Export from `utils/vault.ts` if OPFS operations needed
3. Use existing crypto primitives from `utils/crypto.ts`

## Security Constraints

- **Never log or expose encryption keys**
- **Never store keys in persistent storage** (memory only)
- **All vault data encrypted before OPFS write**
- **WebAuthn PRF output cleared after use**
- **Session key cleared on lock**

## Important Files for Common Tasks

| Task | Files to Modify |
|------|-----------------|
| Add new unlock method | `vault-ops.ts`, `background.ts`, `locked-view.tsx` |
| Change popup layout | `entrypoints/popup/App.tsx`, `components/*.tsx` |
| Add new entry field | `utils/types.ts` VaultEntry, `add-edit-modal.tsx` |
| Modify encryption | `utils/crypto.ts`, `vault/crypto.ts` |
| Add settings option | `settings-modal.tsx`, `vault-ops.ts` handleUpdateSettings |
| Change theme | `style.css`, `tailwind.config.js` |

## Type Definitions

Core types in `utils/types.ts`:

```typescript
interface VaultEntry {
  id: string
  title: string
  username?: string
  password?: string
  url?: string
  notes?: string
  favorite?: boolean
  createdAt: number
  updatedAt: number
}

interface Vault {
  entries: VaultEntry[]
  settings: VaultSettings
}

interface VaultMetadata {
  version: string
  vaultId: string
  createdAt: number
  updatedAt: number
  salt: string
}
```

## Debugging

- Use `console.log` in background service worker (view at `chrome://extensions` → Service Worker)
- Use React DevTools for popup UI
- OPFS files stored at browser's origin storage
- WebAuthn requires HTTPS or localhost

## Code Style

### Comments

**Do not add comments to code.** Code should be self-explanatory through clear naming and structure. Only add comments when:
- Explaining a non-obvious security consideration
- Documenting a workaround for a browser bug
- Marking intentional complexity that cannot be simplified

Remove comments during code cleanup phase.

### After Editing Code

After completing edits, clean up:
1. Remove any comments added during implementation
2. Ensure code is self-explanatory
3. Remove temporary debugging code
4. Run type checks: `pnpm compile`
5. Build the extension: `pnpm build`

## Security

A pre-commit hook and security check script are provided:

**Pre-commit hook** (`.git/hooks/pre-commit`):
- Runs TypeScript compilation check
- Scans for hardcoded secrets
- Detects dangerous eval/Function usage
- Checks for buffer overflow patterns

**Security check script** (`scripts/security-check.sh`):
Run manually: `./scripts/security-check.sh`

Checks for:
- Hardcoded passwords, API keys, secrets, tokens
- Session storage of sensitive data
- eval() and new Function() usage
- String.fromCharCode spread pattern (buffer overflow)
- Subdomain spoofing in URL matching (missing dot boundary)
- Excessive any casts that hide type errors

**Common security patterns to avoid**:
- Never store plaintext passwords in session/local storage
- Always use dot boundary for hostname matching: `hostname === entryHostname || hostname.endsWith('.' + entryHostname)`
- Use chunked string conversion for large buffers instead of spread operator
- Validate imported data before writing to files
- Scope credential filling to the current form, not the entire page

No automated tests currently. Manual testing:

1. Build extension: `pnpm build`
2. Load in Chrome: `chrome://extensions` → Load unpacked → `.output/chrome-mv3`
3. Test flows:
   - Create vault with WebAuthn
   - Add/edit/delete entries
   - Lock/unlock
   - Export/import
   - Recovery phrase