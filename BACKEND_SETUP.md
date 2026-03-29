# Self-Hosted Sync Backend

Run your own sync server for Nemo Password Manager. Users won't need Cloudflare accounts - just your server URL.

## Quick Start

### 1. Deploy the Server

#### Option A: Node.js (Simplest)

```bash
cd backend
npm install
npm start
```

Server runs on port 3000 by default.

#### Option B: Docker

```bash
docker build -t nemo-sync .
docker run -p 3000:3000 -v $(pwd)/data:/app/data nemo-sync
```

#### Option C: Cloudflare Workers (Free)

See `backend/worker.ts` for serverless deployment.

### 2. Configure HTTPS

**Required for Chrome extensions.** Options:

- **Cloudflare Tunnel**: `cloudflared tunnel --url http://localhost:3000`
- **Ngrok**: `ngrok http 3000`
- **Reverse proxy**: Nginx with SSL certificate

Your server needs a public HTTPS URL like:
```
https://nemo-sync.yourdomain.com
```

### 3. Extension Configuration

Update your extension to use your backend:

1. Edit `wxt.config.ts`:
```typescript
host_permissions: [
  '<all_urls>',
  'https://api.cloudflare.com/client/v4/*',
  'https://nemo-sync.yourdomain.com/*'  // Add your server
]
```

2. In the extension's Sync settings, users enter:
   - **Server URL**: `https://nemo-sync.yourdomain.com`
   - **Auth Token**: Generated automatically on first connect

## Server Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `ALLOWED_ORIGIN` | * | CORS origin (set to your extension ID) |
| `RATE_LIMIT_MAX` | 100 | Requests per 15 min per IP |

### CORS for Chrome Extension

For production, set the specific extension origin:

```bash
# Chrome extension origin format:
# chrome-extension://<extension-id>
ALLOWED_ORIGIN=chrome-extension://abc123def456
```

To find your extension ID:
1. Load the extension in Chrome
2. Go to `chrome://extensions`
3. Copy the ID

### Database

Uses SQLite by default. Data stored in `./nemo-sync.db`.

To use PostgreSQL instead, modify `server.ts`:
```javascript
// Replace SQLite with PostgreSQL
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/register | No | Create new user, returns auth token |
| GET | /api/vault | Bearer | Get encrypted vault |
| PUT | /api/vault | Bearer | Save encrypted vault |
| HEAD | /api/vault | Bearer | Check if vault exists |
| GET | /health | No | Health check |

## Security

- **Auth tokens**: 256-bit random tokens, hashed with SHA-256 before storage
- **No plaintext passwords**: Server only stores encrypted vaults
- **Rate limiting**: Built-in protection against abuse
- **Helmet headers**: Security headers included

### Token Lifecycle

1. User opens extension → Clicks "Enable sync"
2. Extension calls `/api/register` → Gets unique token
3. Token stored in Chrome's encrypted local storage
4. All future requests include token in Authorization header
5. Server validates token hash → Returns user data

## Scaling

### Single Server
SQLite + filesystem backup sufficient for thousands of users.

### Multiple Servers
Switch to PostgreSQL with connection pooling:

```javascript
import { Pool } from 'pg';
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
});
```

### CDN/Edge
Put Cloudflare in front:
1. DNS A record → your server IP
2. Enable Cloudflare proxy (orange cloud)
3. Get free SSL and DDoS protection

## Monitoring

Basic health endpoint:
```bash
curl https://your-server/health
```

Returns:
```json
{"status": "ok", "timestamp": 1234567890}
```

## Costs

- **VPS**: $5-10/month (DigitalOcean, Hetzner, etc.)
- **SQLite**: Free (included)
- **Bandwidth**: Minimal (encrypted vaults are small)
- **SSL**: Free with Let's Encrypt or Cloudflare

## Comparison: Self-Hosted vs Cloudflare D1

| Feature | Your Backend | Cloudflare D1 |
|---------|--------------|---------------|
| User setup | Enter URL only | Create Cloudflare account |
| Your cost | Server hosting | Free |
| User cost | Free | Free |
| Data control | You host | User's Cloudflare account |
| Maintenance | You maintain | User maintains |
| Privacy | You see encrypted data | Cloudflare sees encrypted data |

## Troubleshooting

### Extension can't connect
- Check HTTPS (required for Chrome extensions)
- Verify CORS allows your extension origin
- Check browser console for network errors

### "Registration failed"
- Check server logs
- Verify database is writable
- Ensure port 3000 is accessible

### Sync not working
- Check token hasn't been revoked
- Verify vault data size < 1MB
- Check server rate limits

## Production Checklist

- [ ] HTTPS enabled with valid certificate
- [ ] CORS configured for extension origin only
- [ ] Database backups configured
- [ ] Rate limiting enabled
- [ ] Health monitoring set up
- [ ] Server firewall configured
- [ ] Regular security updates
