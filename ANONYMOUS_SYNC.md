# Anonymous Sync (Recommended)

Zero-knowledge, zero-registration sync using Cloudflare Workers.

## How It Works

1. **Extension generates UUID + random token** locally (256-bit)
2. **Token is hashed (SHA-256)** before sending to server
3. **Server stores only the hash**, never the original token
4. **Encrypted vault synced** using this token for auth
5. **No email, no password, no PII** - completely anonymous

## For Users

### One-Click Setup

1. Open Nemo extension
2. Go to Settings → Sync
3. Click **Enable Anonymous Sync**
4. Done! Token is saved locally.

### Backup Your Token

**Important**: Your sync token is stored only on your devices. If you lose it, sync data is lost.

To sync another device:
1. Go to Settings → Sync
2. Click **Show Token**
3. Copy the token
4. On new device: Settings → Sync → **Import Token**

## For Hosts (You)

### Deploy Your Own Server (Optional)

Default server is provided for free. But if you want your own:

```bash
# 1. Install Wrangler
npm install -g wrangler

# 2. Login to Cloudflare
wrangler login

# 3. Create D1 database
wrangler d1 create nemo-sync-db
# Copy database ID

# 4. Update wrangler.toml
# database_id = "your-id"

# 5. Deploy
wrangler deploy
```

**Cost**: Free tier = 100k requests/day

### Why Anonymous?

| Aspect | Traditional | Anonymous |
|--------|-------------|-----------|
| Registration | Email + password | None |
| PII Stored | Name, email, IP | Nothing |
| GDPR Compliance | Complex | Trivial |
| User Data | You hold it | User holds key |
| Legal Risk | High | Minimal |

## Security Model

```
User Device                    Your Server
     |                              |
[Generate Token]                    |
     |                              |
[Hash Token] ----sha256-----> [Store Hash]
     |                              |
[Encrypt Vault]                     |
     |                              |
[Send Ciphertext] ---------> [Store Ciphertext]
     |                              |
```

- Token never leaves device in plaintext
- Server only stores hash + encrypted data
- No way to identify user from server data
- Even you can't access user's passwords

## Token Format

```
Raw Token:    a3f5c8d2e1b9... (256-bit hex string)
Token Hash:   8f7a6b5c4d3e... (SHA-256, stored on server)
```

Token is 64 hex characters = 256 bits of entropy.
Brute force: ~2^256 combinations (impossible).

## Recovery

**If user loses token**:
- Sync data is permanently lost
- Local vault remains on existing devices
- User can create new sync token
- No way to recover (by design)

**This is a feature, not a bug** - true privacy means no one can help.

## Compare with Cloudflare D1

| Feature | Cloudflare D1 | Anonymous Sync |
|---------|---------------|----------------|
| Setup | 5 minutes | 1 click |
| User account | Cloudflare | None |
| Cost to user | Free | Free |
| Cost to you | $0 | Free tier |
| Privacy | Good | Perfect |
| Control | User | You (server) |
| Maintenance | User | You |

## Migration

Users can switch between sync methods:
1. Disable current sync (local vault stays)
2. Enable new sync method
3. Sync uploads vault to new server

No lock-in.

## Legal Compliance

**GDPR**: No personal data stored ✓
**CCPA**: No tracking or selling ✓
**Data retention**: User controls via token ✓
**Right to deletion**: Stop using token ✓

You act as a data processor, not controller.
User remains controller of their data.
