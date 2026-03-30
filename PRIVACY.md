# Privacy Policy for Nemo Password Manager

**Last Updated: March 2025**

## Overview

Nemo Password Manager is a privacy-focused, open-source browser extension designed to store your passwords securely. This privacy policy explains how we handle your data.

## The Most Important Thing: We Cannot Access Your Data

**Nemo uses zero-knowledge encryption.** This means:

1. **All encryption happens in your browser.** Your master password and encryption keys never leave your device.
2. **We never see your passwords.** Your vault is encrypted before it is ever stored anywhere. Even if we wanted to, we cannot read your passwords, usernames, or notes.
3. **Your master password is never transmitted.** It is used only to derive encryption keys locally in your browser.

## Data Storage

### Local Storage (Current Architecture)

Nemo stores all data locally in your browser using the Origin Private File System (OPFS):

- **Encrypted Vault Data**: Stored in your browser's local storage
- **Passkeys**: Stored in your browser's WebAuthn credential manager
- **No Server**: By default, Nemo does not communicate with any external server

### Cloud Sync (Future Feature)

When cloud sync via Cloudflare D1 is enabled:

- **Encrypted blobs only**: The server receives and stores encrypted data. We cannot decrypt it.
- **No plaintext**: Passwords, usernames, notes, and master passwords are encrypted before leaving your browser.
- **You control the keys**: Encryption keys are derived from your master password and never sent to the server.

## Data We Collect

**We collect nothing.** Nemo does not:

- Track usage analytics
- Send telemetry data
- Use cookies for tracking
- Sell or share any data (because we don't have any data to sell)

## Third-Party Services

Nemo uses the following third-party components:

- **WebAuthn/Browser Passkeys**: Managed by your browser and device (Touch ID, Face ID, Windows Hello)
- **Cloudflare Workers/D1 (optional)**: For encrypted cloud sync. Cloudflare receives only encrypted blobs, not plaintext data.

## Your Responsibilities

- **Keep your master password safe.** We cannot recover it. If you lose it, you lose access to your vault permanently.
- **Back up your data.** Use the Export function regularly to create backups.
- **Recovery phrase.** Store your 12-word recovery phrase in a secure location. This is the only way to recover your vault if you forget your master password.

## Data Retention

- **Local Storage**: Data persists until you delete it or clear your browser data.
- **Cloud Sync (when enabled)**: Data is stored until you delete your account or until the retention period expires.

## Security Practices

- **AES-256-GCM encryption** for all stored data
- **PBKDF2 with 600,000 iterations** for key derivation
- **WebAuthn PRF extension** for hardware-backed security
- **No plaintext storage** of passwords anywhere

## Open Source

Nemo is open source under the Apache License 2.0. You can audit the code yourself at the project repository.

## Children's Privacy

Nemo is not intended for children under 13. We do not knowingly collect any data from anyone.

## Changes to This Policy

We may update this privacy policy to reflect changes in our practices. Continued use of Nemo after changes constitutes acceptance of the updated policy.

## Contact

For questions about this privacy policy or the project:
- Open an issue on the project repository
- See the LICENSE file for legal information

## Disclaimer

**THIS SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.**

---

*This privacy policy is effective as of the date shown above.*
