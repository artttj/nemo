# Nemo Session 1: Game-Changing Features

## The Opportunity

Nemo is a browser-native password manager. The space is crowded (1Password, Bitwarden, Proton Pass), but none feel truly native to how engineers actually work. There's room for something sharper.

---

## 10x Features Identified

### 1. **AI-Native Vault Intelligence**

Most password managers are dumb storage. Nemo should understand context:

- **Smart Entry Detection**: Auto-detect what type of credential you're saving (AWS key, database password, API token) and suggest appropriate metadata
- **Usage Pattern Analysis**: Surface credentials you haven't used in 90 days for review
- **Context-Aware Autofill**: Knows the difference between staging and production AWS consoles
- **Intelligent Grouping**: Cluster related credentials (dev environment sets, project bundles)

### 2. **Zero-Friction TOTP Integration**

Current TOTP flows are clunky. Make it invisible:

- **Camera-Free QR Capture**: Auto-detect QR codes in browser tabs, no phone camera dance
- **TOTP Autofill Without Switching**: Fill TOTP codes directly in the login form, no context switch
- **Backup Code Generation**: Auto-save backup codes when creating new TOTP entries
- **TOTP Health Dashboard**: Show which TOTPs lack backup codes

### 3. **Biometric-First Security Model**

Password managers that require typing master passwords constantly train users to be annoyed:

- **WebAuthn/Passkey Integration**: Modern biometric auth, not just master password
- **Session Intelligence**: Stay unlocked for reasonable periods, re-auth for sensitive operations
- **Hardware Key Support**: YubiKey, Titan Security Key native integration
- **Secure Element Usage**: Leverage TPM/Secure Enclave where available

### 4. **Developer-First Workflows**

Engineers manage hundreds of credentials. Optimize for that reality:

- **Environment Variable Export**: One-click export to .env format
- **SSH Key Management**: Store and rotate SSH keys, integrate with ssh-agent
- **API Token Organization**: Group by service, show last used, auto-expire tracking
- **CLI Companion**: Terminal tool that talks to the browser vault
- **Secret Scanning**: Warn before committing vault-exported secrets to git

### 5. **Local-First Architecture**

Cloud-sync-first password managers create unnecessary risk:

- **Encrypted Local Storage**: Primary storage never leaves the device
- **Optional Peer-to-Peer Sync**: Sync between devices without cloud intermediary
- **Airplane Mode Friendly**: Full functionality without internet
- **Export/Import Sanity**: Simple encrypted JSON, no vendor lock-in

---

## Strategic Positioning

**Target**: Senior engineers, devops, security-conscious developers

**Differentiation**:
- 1Password: Corporate, bloated, expensive
- Bitwarden: Functional but uninspired
- Proton Pass: New, limited ecosystem
- **Nemo**: Native-feeling, developer-optimized, local-first

**Key Principle**: Every feature must pass the "does this make life meaningfully better?" test. No feature parity for its own sake.

---

## Session Notes

- Focus on polish over feature count
- Browser extension is the right delivery mechanism
- WXT + React + TypeScript stack chosen for rapid iteration
- Chrome MV3 compliance from day one
