# <img src=".output/chrome-mv3-dev/icons/icon128.png" width="36" alt="" valign="middle" /> Nemo

[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=for-the-badge)](LICENSE)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Google Chrome](https://img.shields.io/badge/Google%20Chrome-4285F4?style=for-the-badge&logo=GoogleChrome&logoColor=white)
![Firefox](https://img.shields.io/badge/Firefox-FF7139?style=for-the-badge&logo=Firefox-Browser&logoColor=white)

**Your passwords stay on your device. No accounts. No cloud. No tracking.**

Nemo is a browser extension that keeps your passwords encrypted on your device. The plaintext never leaves your browser. If you turn on sync, your vault is still end-to-end encrypted, so the server only ever sees ciphertext.

<p align="center">
  <img src="tests/screenshots/readme-unlocked.png" width="400" alt="Nemo unlocked">
</p>

<p align="center">
  <img src="tests/screenshots/readme-locked.png" width="400" alt="Nemo locked">
  <img src="tests/screenshots/readme-autofill.png" width="400" alt="Nemo autofill">
</p>

---

## Why Nemo

Most password managers ask you to trust their servers. Nemo takes a different route.

- **No account required** , you do not sign up anywhere
- **No cloud dependency** , your vault stays in browser storage
- **No tracking** , no analytics, no telemetry, no phone home
- **Zero-knowledge sync** , if you enable sync, the server only stores encrypted data

## What Nemo does

- **Biometric unlock** , use Touch ID, Face ID, Windows Hello, or another WebAuthn authenticator
- **PIN fallback** , unlock with a 4 to 6 digit PIN and brute-force lockout
- **12-word recovery phrase** , your backup if you lose access to your passkey
- **Auto-fill** , detects login forms and fills credentials
- **TOTP codes** , built-in 2FA support with SHA-1, SHA-256, and SHA-512
- **Multiple vaults** , keep work, personal, and shared credentials separate
- **Password generator** , configurable length with rejection sampling for uniform output
- **Encrypted export/import** , move backups safely between devices
- **Optional sync** , use Cloudflare D1 or your own backend with end-to-end encryption

## Getting started

```bash
pnpm install
pnpm dev
```

Open `chrome://extensions`, turn on Developer mode, click **Load unpacked**, and point it to `.output/chrome-mv3-dev`.

**Production build**

```bash
pnpm build        # Chrome
pnpm build:firefox
```

**Run tests**

```bash
pnpm test
cd tests && npm run test:e2e:all
```

**Generate fresh screenshots**

```bash
cd tests && node screenshot-readme.mjs
```

---

## How encryption works

Nemo uses layered keys instead of a master password.

Each unlock method, biometric, PIN, or recovery phrase, derives its own wrapping key. That wrapping key encrypts a single vault key. The vault key then encrypts your data.

### The vault key

Every vault gets a random 256-bit AES-GCM key when it is created. That key encrypts entries, settings, and metadata. It only lives in memory while the vault is unlocked. Once you lock the vault, the key is cleared.

The vault key is never stored in plaintext. It is always wrapped by a key derived from one of your unlock methods.

### Unlock methods

**Biometric unlock, WebAuthn PRF**

Your device authenticator produces a deterministic PRF output tied to your credential. Nemo runs that through HKDF-SHA256 with a 16-byte random salt and the info string `nemo-vault-key` to derive the wrapping key.

This is the primary unlock method. The PRF output never leaves the authenticator hardware.

**PIN**

A 4 to 6 digit PIN is stretched with PBKDF2-SHA256 using 600,000 iterations and a 32-byte random salt. After 5 wrong attempts, PIN unlock is locked out for 30 minutes.

**Recovery phrase**

A 12-word BIP-39 phrase encodes 128 bits of entropy with a 4-bit SHA-256 checksum. The phrase is run through HKDF-SHA256 with a fixed info string to derive the wrapping key. Use it if you lose your passkey or need to restore access on a new device.

### Key flow

```text
You authenticate, biometric, PIN, or recovery phrase
        |
        v
Key derivation, HKDF or PBKDF2
        |
        v
Wrapping key, 256-bit AES-GCM
        |
        v
Unwrap the vault key, AES-GCM decrypt
        |
        v
Vault key, 256-bit, in memory
        |
        v
Decrypt vault entries, AES-GCM
```

### What the server sees

If you enable sync, the server receives ciphertext, salt, IV, KDF identifier, timestamps, and a device ID. It never sees the vault key, any wrapping key, your PIN, your recovery phrase, or your PRF output.

If the server is compromised, the attacker gets only encrypted blobs.

### Crypto parameters

| What | Algorithm | Key size | Salt / IV | Iterations |
|------|-----------|----------|-----------|------------|
| Vault encryption | AES-256-GCM | 256-bit | 12-byte IV | – |
| Key wrapping | AES-256-GCM | 256-bit | 12-byte IV | – |
| PIN derivation | PBKDF2-SHA256 | 256-bit | 32-byte salt | 600,000 |
| Biometric derivation | HKDF-SHA256 | 256-bit | 16-byte salt | – |
| Recovery derivation | HKDF-SHA256 | 256-bit | fixed salt | – |
| Password generation | CSPRNG | – | 32-byte pool | rejection sampling |
| Recovery phrase | BIP-39 | 128-bit entropy | 4-bit checksum | 12 words |

All random values come from `crypto.getRandomValues()`. CryptoKey objects are created as non-extractable wherever possible.

**Architecture diagrams**

**Encryption key hierarchy**

<img src="docs/diagrams/encryption-architecture.png" alt="Encryption Architecture" style="max-height: 400px; width: auto;">

**System components**

<img src="docs/diagrams/system-architecture.png" alt="System Architecture" style="max-height: 450px; width: auto;">

---

## Architecture

### Storage

Nemo uses the Origin Private File System, or OPFS, a sandboxed filesystem that only the extension can access. It does not use localStorage or cookies.

```text
OPFS root/
  nemo-vault/
    vault.enc                   # encrypted vault blob (ciphertext + IV + salt)
    metadata.json               # public metadata, salt, KDF type, timestamps
```

Session state lives in `chrome.storage.session`, which clears when the browser closes. Theme preference and sync retry state live in `chrome.storage.local`.

### Extension components

```text
entrypoints/
  background.ts      Service worker. Routes messages, manages vault lifecycle,
                     auto-lock timer, and keyboard shortcuts.

  content.ts         Content script. Detects login forms, shows the autofill
                     overlay, and handles credential capture.

  popup/App.tsx      Main popup UI. Entry list, search, add/edit, settings,
                     and vault selector.

  webauthn/          Separate page for WebAuthn ceremonies.

vault/
  crypto.ts          AES-GCM encrypt/decrypt and PBKDF2 key derivation.
  storage.ts         OPFS read/write and Cloudflare D1 adapter.
  recovery.ts        BIP-39 phrase generation and recovery.
  pin.ts             PIN derivation and lockout tracking.
  custom-sync.ts     Custom backend adapter.
  sync.ts            Cloudflare D1 sync adapter.

utils/
  crypto.ts          Low-level crypto helpers.
  auth.ts            WebAuthn registration and authentication.
  totp.ts            TOTP implementation, RFC 6238.
  vault-ops/         Background-only vault operations.
```

### Autofill

The content script runs on every page.

1. It scans for username and password fields using type attributes, autocomplete hints, and name or id keywords
2. It attaches a small button next to each detected field
3. On click, it asks the background script for matching entries by URL
4. It shows an overlay with matching credentials
5. It fills the selected entry and dispatches `input` and `change` events for framework compatibility
6. On form submit, HTTPS only, it offers to save new credentials

The overlay uses plain DOM, not `innerHTML`, to reduce XSS risk from page content.

### Sync

Sync is optional. By default, encrypted vault data syncs to a Cloudflare D1 database hosted at `nemo-sync.artyom-yagovdik.workers.dev`. You are responsible for your own data, and for any risks that come with running sync on third-party infrastructure. This project is not liable for data loss, breaches, or third-party costs.

You can also run your own backend. It needs these endpoints:

- `POST /api/register` — create a new user and return an auth token
- `GET /api/vault` — fetch the encrypted vault
- `PUT /api/vault` — save the encrypted vault
- `HEAD /api/vault` — check if a vault exists
- `GET /api/vault/metadata` — fetch vault metadata
- `PUT /api/vault/metadata` — save vault metadata

A reference server lives in `backend/server.ts`, built with Express and SQLite.

Both sync options use last-write-wins conflict resolution. The sync manager runs every 5 minutes while the vault is unlocked.

---

## Project structure

```text
nemo/
  entrypoints/         Extension entry points
  vault/                Core vault logic
  utils/                Shared utilities
    vault-ops/          Background-only operations
  components/          React UI components
  backend/             Reference sync server
  config/              Extension configuration
  tests/               Unit and E2E tests
  style.css            Global styles
  wxt.config.ts        WXT extension framework config
```

## License

Apache 2.0. See [LICENSE](LICENSE).

## Privacy

See [PRIVACY.md](PRIVACY.md).

---

This is a personal project, not a commercial security product. Please export your vault regularly. If you lose your recovery phrase and your passkey, your data is gone.
