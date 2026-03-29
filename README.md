# Nemo Password Manager

A local-first, privacy-focused password manager browser extension with passkey authentication and a tactical UI.

## ⚠️ DISCLAIMER

**THIS SOFTWARE IS PROVIDED "AS IS" FOR EDUCATIONAL AND PERSONAL USE.**

- The developer is **NOT a security company**. Use at your own risk.
- The developer does **NOT have access to your master password or unencrypted data** and cannot help you recover access if you lose your credentials.
- You are responsible for **regular backups**. Export your vault frequently.
- This is a **hobby project**, not a commercial product. No uptime guarantees.
- See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for details.

## Features

- **Multi-Vault Support** - Create and manage multiple vaults (work, personal, etc.)
- **Passkey Authentication** - Unlock your vault using biometrics (Touch ID, Face ID, Windows Hello)
- **PIN Unlock** - Alternative unlock method with configurable PIN
- **AES-256-GCM Encryption** - All data encrypted at rest with industry-standard cryptography
- **PBKDF2 Key Derivation** - 600,000 iterations for password-based unlock
- **Local Storage (OPFS)** - Your data never leaves your device
- **Zero-Knowledge** - We can't see your passwords even if we wanted to
- **Recovery Phrases** - 12-word BIP-39 phrases for account recovery
- **Auto-Fill Detection** - Automatically detects password fields on websites
- **Export/Import** - Backup and restore your vault

## Tech Stack

- **Framework**: [WXT](https://wxt.dev) - Modern browser extension framework
- **Encryption**: Web Crypto API (AES-256-GCM + PBKDF2)
- **Auth**: WebAuthn / Passkeys
- **Storage**: Origin Private File System (OPFS)
- **UI**: React 18 + Tailwind CSS + TypeScript
- **Style**: Tactical HUD with chamfered corners, dark theme

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Load Extension

1. Open Chrome/Edge and navigate to `chrome://extensions`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select `.output/chrome-mv3-dev` directory

### Build for Production

```bash
pnpm build
```

The production build will be in `.output/chrome-mv3`.

### Run with Firefox

```bash
pnpm dev:firefox
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser Extension                         │
├─────────────┬─────────────┬──────────────┬──────────────────┤
│   Popup     │  Options    │   Content    │   Background    │
│   (React)   │  (React)    │   Script      │   Service Worker│
├─────────────┴─────────────┴──────────────┴──────────────────┤
│                    Core Libraries                           │
├──────────────┬──────────────┬───────────────────────────────┤
│   Crypto     │   Vault      │   WebAuthn                    │
│   (AES-256)  │   (OPFS)     │   (Passkeys)                  │
└──────────────┴──────────────┴───────────────────────────────┘
                              │
                              ▼
                    ┌───────────────┐
                    │   Local OPFS  │
                    │   (Encrypted) │
                    └───────────────┘
```

## Encryption

All cryptographic operations use the [Web Crypto API (SubtleCrypto)](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto), which provides hardware-backed primitives where available. No third-party crypto libraries are used.

### Vault Encryption

Every vault is encrypted with a unique **vault key**: a random, non-extractable AES-256-GCM key generated at vault creation time. The vault key never leaves memory in plaintext — at rest it is always wrapped (encrypted) by a separate wrapping key.

| Parameter | Value |
|-----------|-------|
| Algorithm | AES-256-GCM |
| Key size | 256 bits |
| IV size | 12 bytes (random, per write) |
| Authenticated | Yes (GCM provides integrity) |

On every save, a fresh 12-byte IV is generated and the entire vault JSON is re-encrypted. The ciphertext and IV are stored together in OPFS.

### Key Wrapping

The vault key is protected using **key wrapping**: `crypto.subtle.wrapKey()` encrypts the vault key with a wrapping key derived from user credentials. Unwrapping happens at unlock time. This means the vault key itself is never stored in plaintext anywhere.

```
Vault Key (AES-256-GCM)
  ↓ wrapKey() with AES-GCM + 12-byte IV
Wrapped Key (stored in OPFS)
```

Each unlock method (passkey, PIN, recovery phrase) has its own wrapping key and its own wrapped copy of the vault key.

### Key Derivation by Unlock Method

#### Passkey (WebAuthn PRF)

The primary unlock method. The browser authenticator generates a deterministic pseudo-random output via the [PRF extension](https://w3c.github.io/webauthn/#prf-extension), which is unique to the credential and a stored 32-byte salt.

```
WebAuthn PRF output (32+ bytes, deterministic per credential + salt)
  ↓ ImportKey as HKDF material
  ↓ DeriveKey with HKDF-SHA256
      salt:  stored vault salt (16 bytes)
      info:  "nemo-vault-key"
  → Wrapping key (AES-256-GCM)
  ↓ unwrapKey() with stored wrapped vault key
  → Vault key (in-memory only)
```

The PRF output is deterministic: the same credential and the same PRF salt always produce the same output. No password is involved.

#### PIN

A 4–6 digit numeric PIN as an alternative unlock.

```
PIN digits (UTF-8 encoded)
  ↓ ImportKey as PBKDF2 material
  ↓ DeriveKey with PBKDF2-SHA256
      salt:       32 random bytes (stored with PIN data)
      iterations: 100,000
      hash:       SHA-256
  → Wrapping key (AES-256-GCM)
  ↓ unwrapKey() with stored wrapped vault key
  → Vault key (in-memory only)
```

Failed PIN attempts are tracked. After 5 failures, the PIN is locked for 30 minutes.

#### Recovery Phrase

A 12-word BIP-39 phrase generated at vault creation time. The phrase encodes 128 bits of entropy (11 bits per word from a 2048-word wordlist).

```
12-word BIP-39 phrase → 128-bit entropy (Uint8Array)
  ↓ ImportKey as HKDF material
  ↓ DeriveKey with HKDF-SHA256
      salt:  "nemo-vault-recovery" (encoded)
      info:  "encryption-key" (encoded)
  → Wrapping key (AES-256-GCM)
  ↓ unwrapKey() with stored wrapped vault key
  → Vault key (in-memory only)
```

The recovery phrase is shown once at vault creation and never stored. Losing it means recovery is impossible if other unlock methods fail.

### Unlock Flows Summary

**Create vault**
1. Register WebAuthn credential, extract PRF output
2. Generate random vault key (AES-256-GCM, non-extractable)
3. Derive wrapping key from PRF via HKDF-SHA256
4. Wrap vault key → store in OPFS
5. Generate recovery phrase → derive recovery wrapping key → store separate wrapped copy
6. Encrypt empty vault with vault key → store in OPFS

**Unlock with passkey**
1. Authenticate with WebAuthn, extract PRF output (same credential + salt = same output)
2. Derive wrapping key via HKDF-SHA256 using stored salt
3. Unwrap vault key from OPFS
4. Decrypt vault with vault key → hold in memory

**Unlock with PIN**
1. Derive wrapping key from PIN via PBKDF2-SHA256 using stored salt
2. Unwrap vault key from OPFS
3. Decrypt vault with vault key → hold in memory

**Unlock with recovery phrase**
1. Validate words against BIP-39 wordlist, convert to entropy
2. Derive wrapping key via HKDF-SHA256
3. Unwrap vault key from recovery backup in OPFS
4. Decrypt vault with vault key → hold in memory

**Lock**
1. Overwrite in-memory vault key reference
2. Clear vault data from memory

### OPFS Storage Layout

Each vault lives in its own directory under the Origin Private File System:

```
nemo-vault-{vaultId}/
├── vault.enc        # AES-256-GCM ciphertext + IV (JSON)
├── metadata.json    # Vault ID, salt, KDF type, timestamps
└── key.enc          # Wrapped vault key + IV (JSON)
vault-registry.json  # List of vaults + active vault ID
```

The `metadata.json` file contains the salt used for key derivation. It is not secret — salts are designed to be public. The ciphertext in `vault.enc` is meaningless without the vault key, which requires a successful authentication to unwrap.

### Random Value Generation

All random values (IVs, salts, keys, credential IDs, challenges) are generated with `crypto.getRandomValues()`, the browser's CSPRNG. UUIDs use `crypto.randomUUID()`.

### Parameters at a Glance

| Operation | Algorithm | Key/Output size | Iterations / Salt |
|-----------|-----------|-----------------|-------------------|
| Vault encryption | AES-256-GCM | 256-bit key, 12-byte IV | — |
| Key wrapping | AES-GCM | — | 12-byte IV |
| PIN key derivation | PBKDF2-SHA256 | 256-bit | 100,000 iter, 32-byte salt |
| PRF → wrapping key | HKDF-SHA256 | 256-bit | 16-byte salt, `"nemo-vault-key"` info |
| Recovery → wrapping key | HKDF-SHA256 | 256-bit | `"nemo-vault-recovery"` salt |
| Recovery phrase entropy | BIP-39 (2048-word) | 128-bit | — |
| All random generation | `crypto.getRandomValues()` | — | — |

## Project Structure

```
nemo/
├── entrypoints/
│   ├── popup/              # Popup UI
│   ├── options.tsx          # Settings page
│   ├── background.ts        # Service worker
│   ├── content.ts          # Content scripts
│   └── webauthn/          # WebAuthn flow
├── components/
│   ├── vault-selector.tsx   # Vault switching dropdown
│   ├── add-edit-modal.tsx   # Add/edit entry modal
│   ├── entry-detail-modal.tsx # Entry detail view
│   ├── entry-card.tsx      # Entry card component
│   ├── locked-view.tsx     # Locked state
│   ├── settings-modal.tsx  # Settings modal
│   └── ui.tsx             # Shared UI components
├── vault/                  # New vault architecture
│   ├── types.ts            # Type definitions
│   ├── crypto.ts           # Encryption utilities
│   ├── storage.ts          # Storage abstraction
│   ├── recovery.ts         # Recovery phrase system
│   ├── vault.ts           # Vault data model
│   ├── manager.ts         # Vault orchestration
│   └── index.ts           # Public API
├── utils/                  # Legacy utilities (being migrated)
│   ├── crypto.ts           # Encryption utilities
│   ├── auth.ts            # WebAuthn integration
│   ├── vault.ts           # OPFS storage
│   ├── vault-ops.ts       # Business logic
│   ├── webauthn-handler.ts # WebAuthn promise handling
│   └── types.ts           # TypeScript definitions
├── design-system/
│   └── tactical.css       # Tactical UI design tokens
├── assets/                # Extension icons
├── tailwind.config.js      # Tailwind config
└── wxt.config.ts          # WXT configuration
```

## Key Files

| File | Purpose |
|------|---------|
| `vault/crypto.ts` | AES-256-GCM encryption, PBKDF2 derivation |
| `vault/storage.ts` | Storage abstraction (local/remote adapters) |
| `vault/recovery.ts` | BIP-39 recovery phrase system |
| `vault/manager.ts` | Vault orchestration layer |
| `entrypoints/background.ts` | Service worker, message router |
| `entrypoints/content.ts` | Password field detection, auto-fill overlay |
| `components/tactical-popup.tsx` | Main popup (tactical UI) |

## Design System

The tactical UI uses:
- **Colors**: Void (#0A0A0F), Card (#12121A), Accent (#00FF88)
- **Typography**: Orbitron (headings), JetBrains Mono (body/data)
- **Shapes**: Chamfered corners (45° cuts)
- **Effects**: Scanline overlay, neon glow, pulse animations

## Browser Support

- Chrome/Chromium 102+ (Manifest V3)
- Edge 102+
- Firefox 109+ (with WXT adapter)

## What Works

### Vault Management
- Create multiple vaults for different purposes
- Switch between vaults instantly
- Rename and delete vaults
- Each vault has separate encryption

### Authentication
- Biometric unlock via WebAuthn (Touch ID, Windows Hello)
- PIN unlock as backup method
- 12-word recovery phrase for emergency access
- Auto-lock after inactivity

### Password Storage
- Add, edit, and delete password entries
- Store title, username, password, URL, and notes
- Generate secure passwords
- Copy credentials to clipboard with auto-clear

### Import/Export
- Export vault as encrypted JSON backup
- Import from backup file

### Browser Integration
- Extension popup for quick access
- Auto-fill detection on login pages
- Favicon fetching for visual identification

### Platform Constraints
- WebAuthn requires HTTPS or localhost
- OPFS requires secure context
- Passkey backup depends on platform sync (iCloud, Google Password Manager)

## Security Recommendations

1. **Export your vault regularly** - Keep offline backups. Data loss is your responsibility.
2. **Register multiple passkeys** - Different devices as backup
3. **Save your recovery phrase** - 12-word BIP-39 phrase for account recovery. Store it offline in a secure location.
4. **Keep browser updated** - Security patches
5. **Use strong device passcode** - First line of defense

## Zero-Knowledge Architecture

Nemo is designed so that **we cannot access your passwords even if we wanted to**:

1. **All encryption happens in your browser** - Passwords are encrypted with AES-256-GCM before storage
2. **Master password never leaves your device** - It's used only to derive encryption keys locally
3. **Server only sees encrypted blobs** - When cloud sync is enabled, the server receives ciphertext, not plaintext
4. **Recovery phrase is the only backup** - We cannot reset your password

If you lose your master password and recovery phrase, your data is permanently inaccessible. We cannot help you recover it.

## License

Apache License 2.0 - See [LICENSE](LICENSE) for details.

## Privacy Policy

See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for our privacy policy.
