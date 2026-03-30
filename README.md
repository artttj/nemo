# Nemo Password Manager

A local-first password manager extension. No accounts, no tracking. Your passwords stay encrypted with keys only you control.

## Features

- Multiple vaults (work, personal, etc.)
- Biometric unlock via WebAuthn (Touch ID, Face ID, Windows Hello)
- PIN backup unlock method
- AES-256-GCM encryption with PBKDF2 key derivation (600,000 iterations)
- 12-word BIP-39 recovery phrases
- Auto-fill on login pages
- Export/import for backups
- Optional sync: Cloudflare D1 or custom backend
- Light/dark/system theme

## Install

```bash
pnpm install
pnpm dev
```

Load the extension from `.output/chrome-mv3-dev` in Chrome's developer mode.

Build for production:

```bash
pnpm build
```

Firefox: `pnpm dev:firefox`

## Encryption

Every vault has a unique AES-256-GCM key generated at creation. The key never touches disk in plaintext—it gets wrapped (encrypted) by keys derived from your unlock methods.

### Passkey

Uses WebAuthn PRF extension for deterministic key derivation. Same credential + same salt = same wrapping key via HKDF-SHA256.

### PIN

4-6 digits with PBKDF2-SHA256 (600,000 iterations). Locks for 30 minutes after 5 failed attempts.

### Recovery phrase

12 words from BIP-39 wordlist. Verify and store it safely—you need it if you lose your passkey.

### Key flow

```
Passkey/PIN/Recovery → Key derivation → Wrapping key (AES-256)
                                          ↓
                                    unwrapKey()
                                          ↓
                                    Vault key (memory only)
                                          ↓
                                    Decrypt vault
```

## Storage

Uses Origin Private File System (OPFS):

```
nemo-vault-{id}/
├── vault.enc      # Encrypted vault + IV
├── metadata.json  # Salt, KDF, timestamps
└── key.enc        # Wrapped vault key

vault-registry.json  # Vault list + active ID
```

Metadata and salts are public. Ciphertext requires the unwrapped vault key.

## Sync Options

### Cloudflare D1

Sync encrypted vaults across devices. End-to-end encrypted—Cloudflare stores ciphertext only.

See [CLOUDFLARE_SYNC.md](CLOUDFLARE_SYNC.md) for setup.

### Custom Backend

Self-hosted sync server. See [BACKEND_SETUP.md](BACKEND_SETUP.md) and [SYNC_SETUP.md](SYNC_SETUP.md).

## Project Structure

```
entrypoints/
├── popup/          # Main UI
├── background.ts   # Service worker
├── content.ts      # Auto-fill
└── webauthn/       # Passkey handling

vault/
├── crypto.ts       # AES-GCM, PBKDF2, HKDF
├── storage.ts      # OPFS
├── recovery.ts     # BIP-39
├── vault.ts        # Data model
└── custom-sync.ts  # Custom backend sync

components/         # React components
utils/              # Utilities
```

## Crypto Parameters

| Operation | Algorithm | Parameters |
|-----------|-----------|------------|
| Vault encryption | AES-256-GCM | 256-bit key, 12-byte IV |
| Key wrapping | AES-GCM | 256-bit key, 12-byte IV |
| PIN derivation | PBKDF2-SHA256 | 600,000 iterations, 32-byte salt |
| PRF derivation | HKDF-SHA256 | 256-bit, 16-byte salt |
| Recovery | HKDF-SHA256 | Fixed salt per vault |

## License

Apache 2.0. See [LICENSE](LICENSE).

## Privacy

See [PRIVACY.md](PRIVACY.md).

---

**Disclaimer:** This is a hobby project, not a commercial security product. Use at your own risk. Export your vault regularly. If you lose your recovery phrase and passkey, your data cannot be recovered.
