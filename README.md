# Nemo Password Manager

A local-first, privacy-focused password manager browser extension with passkey authentication.

## Features

- **Passkey Authentication** - Unlock your vault using biometrics (Touch ID, Face ID, Windows Hello)
- **AES-256-GCM Encryption** - All data encrypted at rest with industry-standard cryptography
- **Local Storage (OPFS)** - Your data never leaves your device
- **Zero-Knowledge** - We can't see your passwords even if we wanted to
- **Auto-Fill Detection** - Automatically detects password fields on websites
- **Export/Import** - Backup and restore your vault

## Tech Stack

- **Framework**: [Plasmo](https://plasmo.com) - The modern browser extension framework
- **Encryption**: Web Crypto API (AES-256-GCM + PBKDF2)
- **Auth**: WebAuthn / Passkeys
- **Storage**: Origin Private File System (OPFS)
- **UI**: React 18 + Tailwind CSS + TypeScript

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
4. Select the `build/chrome-mv3-dev` directory

### Build for Production

```bash
pnpm build
```

The production build will be in `build/chrome-mv3`.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
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

1. User authenticates with biometric (WebAuthn)
2. Authentication signature is hashed with SHA-256
3. Result combined with salt via PBKDF2 (100,000 iterations)
4. Final key used for AES-256-GCM encryption

### Data Flow

1. **Create Vault**: Generate passkey → derive encryption key → encrypt empty vault → store in OPFS
2. **Unlock**: Authenticate with passkey → derive key → decrypt vault from OPFS
3. **Save**: Auto-encrypt on every change → write to OPFS
4. **Lock**: Clear in-memory key → clear vault from memory

### Zero-Knowledge

- Encryption keys are derived from WebAuthn signature (never stored)
- Vault is encrypted before storage
- Server never has access to unencrypted data
- Even if OPFS is compromised, attacker gets encrypted blob

## Development

### Project Structure

```
nemo/
├── popup.tsx              # Main popup UI
├── options.tsx            # Settings page
├── src/
│   ├── background/        # Service worker
│   ├── content/           # Content scripts
│   ├── lib/               # Core modules
│   │   ├── crypto.ts      # Encryption utilities
│   │   ├── vault.ts       # OPFS storage
│   │   ├── auth.ts        # WebAuthn integration
│   │   └── vault-ops.ts   # Business logic
│   ├── popup/             # Popup components
│   │   └── components/
│   └── types/             # TypeScript definitions
├── assets/                # Extension icons
├── style.css              # Tailwind styles
└── tailwind.config.js     # Tailwind config
```

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/crypto.ts` | AES-256-GCM encryption utilities |
| `src/lib/auth.ts` | WebAuthn passkey registration/authentication |
| `src/lib/vault.ts` | OPFS file operations |
| `src/lib/vault-ops.ts` | Vault business logic, message handling |
| `src/background/index.ts` | Background service worker, message router |
| `src/content/index.ts` | Password field detection, auto-fill overlay |
| `popup.tsx` | Main popup React component |
| `options.tsx` | Settings page React component |

## Browser Support

- Chrome/Chromium 102+ (Manifest V3)
- Edge 102+
- Firefox 109+ (with adjustment to manifest)

## Limitations

### Current MVP

- Single browser profile (no sync)
- No password strength checker
- No breach monitoring
- No form capture (manual entry only)
- No custom fields

### Platform Constraints

- WebAuthn requires HTTPS or localhost
- OPFS requires secure context
- Passkey backup depends on platform sync (iCloud, Google Password Manager)

## Security Recommendations

1. **Export your vault regularly** - Keep offline backups
2. **Register multiple passkeys** - Different devices as backup
3. **Keep browser updated** - Security patches
4. **Use strong device passcode** - First line of defense

## License

MIT

## Credits

Built with [Plasmo Framework](https://plasmo.com)