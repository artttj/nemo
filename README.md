# Nemo Password Manager

A local-first, privacy-focused password manager browser extension with passkey authentication and a tactical UI.

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

## Security Model

### Key Derivation

1. User authenticates with biometric (WebAuthn PRF)
2. Authentication signature is hashed with SHA-256
3. Result combined with salt via PBKDF2 (600,000 iterations)
4. Final key used for AES-256-GCM encryption

### Data Flow

1. **Create Vault**: Generate passkey → derive encryption key → encrypt empty vault → store in OPFS
2. **Unlock**: Authenticate with passkey → derive key → decrypt vault from OPFS
3. **Save**: Auto-encrypt on every change → write to OPFS
4. **Lock**: Clear in-memory key → clear vault from memory
5. **Recover**: 12-word BIP-39 phrase → derive recovery key → decrypt vault

### Zero-Knowledge

- Encryption keys are derived from WebAuthn signature (never stored as-is)
- Vault is encrypted before storage
- Server never has access to unencrypted data (local-only MVP)
- Even if OPFS is compromised, attacker gets encrypted blob

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

## Limitations

### Current MVP

- Local-only (no sync between devices)
- No password strength checker
- No breach monitoring
- Manual entry only (no form capture)
- No custom fields
- No folder/categories (use multiple vaults instead)

### Platform Constraints

- WebAuthn requires HTTPS or localhost
- OPFS requires secure context
- Passkey backup depends on platform sync (iCloud, Google Password Manager)

## Security Recommendations

1. **Export your vault regularly** - Keep offline backups
2. **Register multiple passkeys** - Different devices as backup
3. **Save your recovery phrase** - 12-word BIP-39 phrase for account recovery
4. **Keep browser updated** - Security patches
5. **Use strong device passcode** - First line of defense

## License

MIT
