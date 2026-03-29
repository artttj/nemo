# Security Model

## Database Access

D1 database accessible **only** via Cloudflare Worker. Direct access blocked.

```
User -> Worker -> D1
       ↑
    [Auth required]
```

## Authentication

### Token Generation
- 256-bit random generated client-side
- Never leaves device in plaintext (only hash sent)
- Stored in Chrome's encrypted storage

### Worker Validation
```typescript
const token = request.headers.authorization?.split(" ")[1];
const hash = await sha256(token);

const user = await db.prepare(
  "SELECT user_id FROM vaults WHERE token_hash = ?"
).bind(hash).first();

if (!user) return 401;
```

## Data Isolation

Each user sees only their data:

```typescript
// SQL queries always filter by user_id
SELECT * FROM vaults WHERE user_id = ?
```

## What You Control

| Resource | Access |
|----------|--------|
| D1 API Token | Only in Worker env |
| Database schema | You define |
| Rate limiting | Worker implements |
| CORS | Worker validates |

## What User Controls

- Their anonymous token (client-side)
- Their encrypted vault data

## Attack Scenarios

| Attack | Protection |
|--------|------------|
| Direct D1 access | No API token exposed |
| Brute force token | 2^256 combinations |
| Token leak | Hash only stored server-side |
| Worker compromise | Data encrypted, no keys |

Database isolated. User data encrypted. Worker is gatekeeper.
