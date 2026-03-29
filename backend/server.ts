

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;

let db: any;

async function initDb() {
  db = await open({
    filename: "./nemo-sync.db",
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      auth_token_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vaults (
      user_id TEXT PRIMARY KEY,
      ciphertext TEXT NOT NULL,
      salt TEXT NOT NULL,
      iv TEXT NOT NULL,
      kdf TEXT NOT NULL,
      version INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS vault_metadata (
      user_id TEXT PRIMARY KEY,
      version INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      device_id TEXT NOT NULL,
      salt TEXT NOT NULL,
      kdf TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_users_token ON users(auth_token_hash);
  `);
}

app.use(helmet());

// CORS: Require explicit origin configuration, reject if not set
const allowedOrigin = process.env.ALLOWED_ORIGIN;
if (!allowedOrigin) {
  console.error('ERROR: ALLOWED_ORIGIN environment variable must be set');
  process.exit(1);
}
app.use(cors({ origin: allowedOrigin }));

// Limit request size to prevent DoS
app.use(express.json({ limit: "10mb" }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
});
app.use(limiter);

// Constant-time comparison to prevent timing attacks
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function authenticateToken(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  // Get all users and compare in constant-time to prevent timing attacks
  const users = await db.all("SELECT id, auth_token_hash FROM users");

  let validUser: { id: string } | null = null;
  for (const user of users) {
    if (timingSafeCompare(user.auth_token_hash, tokenHash)) {
      validUser = user;
      break;
    }
  }

  if (!validUser) {
    return res.status(401).json({ error: "Invalid token" });
  }

  (req as any).userId = validUser.id;
  next();
}

app.post("/api/register", async (req, res) => {
  try {
    const userId = crypto.randomUUID();
    const authToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(authToken).digest("hex");

    await db.run(
      "INSERT INTO users (id, auth_token_hash, created_at) VALUES (?, ?, ?)",
      [userId, tokenHash, Date.now()]
    );

    res.json({
      userId,
      authToken, 
      message: "Save this token - it won't be shown again",
    });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
});

app.get("/api/vault", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;

    const [vault, metadata] = await Promise.all([
      db.get("SELECT * FROM vaults WHERE user_id = ?", userId),
      db.get("SELECT * FROM vault_metadata WHERE user_id = ?", userId),
    ]);

    if (!vault || !metadata) {
      return res.status(404).json({ error: "Vault not found" });
    }

    res.json({
      vault: {
        kdf: vault.kdf,
        salt: vault.salt,
        iv: vault.iv,
        ciphertext: vault.ciphertext,
        version: vault.version,
      },
      metadata: {
        version: metadata.version,
        vaultId: userId,
        createdAt: metadata.created_at,
        updatedAt: metadata.updated_at,
        deviceId: metadata.device_id,
        salt: metadata.salt,
        kdf: metadata.kdf,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get vault" });
  }
});

app.put("/api/vault", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { vault, metadata } = req.body;

    // Validate vault size (max 5MB of base64-encoded ciphertext)
    if (vault?.ciphertext && Buffer.byteLength(vault.ciphertext, 'base64') > 5 * 1024 * 1024) {
      return res.status(413).json({ error: "Vault too large" });
    }

    await db.run(
      `
      INSERT INTO vaults (user_id, ciphertext, salt, iv, kdf, version, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        ciphertext = excluded.ciphertext,
        salt = excluded.salt,
        iv = excluded.iv,
        kdf = excluded.kdf,
        version = excluded.version,
        updated_at = excluded.updated_at
    `,
      [
        userId,
        vault.ciphertext,
        vault.salt,
        vault.iv,
        vault.kdf,
        vault.version,
        Date.now(),
      ]
    );

    await db.run(
      `
      INSERT INTO vault_metadata (user_id, version, created_at, updated_at, device_id, salt, kdf)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        version = excluded.version,
        updated_at = excluded.updated_at,
        device_id = excluded.device_id,
        salt = excluded.salt,
        kdf = excluded.kdf
    `,
      [
        userId,
        metadata.version,
        metadata.createdAt,
        metadata.updatedAt,
        metadata.deviceId,
        metadata.salt,
        metadata.kdf,
      ]
    );

    res.json({ success: true, updatedAt: Date.now() });
  } catch (error) {
    res.status(500).json({ error: "Failed to save vault" });
  }
});

app.head("/api/vault", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const vault = await db.get(
      "SELECT 1 FROM vaults WHERE user_id = ?",
      userId
    );

    if (vault) {
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    res.sendStatus(500);
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Nemo sync server running on port ${PORT}`);
    console.log(`API endpoints:`);
    console.log(`  POST /api/register - Create new user`);
    console.log(`  GET  /api/vault - Get vault data`);
    console.log(`  PUT  /api/vault - Save vault data`);
    console.log(`  HEAD /api/vault - Check if vault exists`);
  });
});
