

export interface Env {
  NEMO_SYNC: D1Database;
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";

    
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    try {
      
      await env.NEMO_SYNC.prepare(
        `CREATE TABLE IF NOT EXISTS vaults (user_id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, ciphertext TEXT, salt TEXT, iv TEXT, kdf TEXT, version INTEGER, updated_at INTEGER, created_at INTEGER NOT NULL)`
      ).run();

      await env.NEMO_SYNC.prepare(
        `CREATE TABLE IF NOT EXISTS vault_metadata (user_id TEXT PRIMARY KEY, version INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER, device_id TEXT, salt TEXT, kdf TEXT, FOREIGN KEY (user_id) REFERENCES vaults(user_id))`
      ).run();

      await env.NEMO_SYNC.prepare(
        `CREATE INDEX IF NOT EXISTS idx_token_hash ON vaults(token_hash)`
      ).run();

      
      if (url.pathname === "/health") {
        return new Response(JSON.stringify({
          status: "ok",
          timestamp: Date.now(),
          anonymous: true
        }), {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(origin)
          },
        });
      }

      
      if (url.pathname === "/api/register" && request.method === "POST") {
        const userId = crypto.randomUUID();
        const authToken = generateToken();
        const tokenHash = await hashToken(authToken);

        await env.NEMO_SYNC.prepare(
          `INSERT INTO vaults (user_id, token_hash, created_at) VALUES (?, ?, ?)`
        ).bind(userId, tokenHash, Date.now()).run();

        return new Response(
          JSON.stringify({
            userId,
            authToken, 
            message: "Save this token - it won't be shown again",
          }),
          {
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders(origin)
            },
          }
        );
      }

      
      const authHeader = request.headers.get("Authorization");
      const token = authHeader?.split(" ")[1];

      if (!token) {
        return new Response(JSON.stringify({ error: "No token provided" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }

      const tokenHash = await hashToken(token);

      
      const userResult = await env.NEMO_SYNC.prepare(
        `SELECT user_id FROM vaults WHERE token_hash = ?`
      ).bind(tokenHash).first<{ user_id: string }>();

      if (!userResult) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }

      const userId = userResult.user_id;

      
      if (url.pathname === "/api/vault" && request.method === "GET") {
        const [vault, metadata] = await Promise.all([
          env.NEMO_SYNC.prepare(
            `SELECT ciphertext, salt, iv, kdf, version, updated_at
             FROM vaults WHERE user_id = ?`
          ).bind(userId).first(),
          env.NEMO_SYNC.prepare(
            `SELECT version, created_at, updated_at, device_id, salt, kdf
             FROM vault_metadata WHERE user_id = ?`
          ).bind(userId).first(),
        ]);

        if (!vault || !metadata) {
          return new Response(JSON.stringify({ error: "Vault not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
          });
        }

        return new Response(
          JSON.stringify({
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
          }),
          {
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders(origin)
            },
          }
        );
      }

      
      if (url.pathname === "/api/vault" && request.method === "PUT") {
        const body = await request.json<{
          vault: {
            ciphertext: string;
            salt: string;
            iv: string;
            kdf: string;
            version: number;
          };
          metadata: {
            version: number;
            createdAt: number;
            updatedAt: number;
            deviceId: string;
            salt: string;
            kdf: string;
          };
        }>();

        await Promise.all([
          env.NEMO_SYNC.prepare(
            `UPDATE vaults SET ciphertext = ?, salt = ?, iv = ?, kdf = ?, version = ?, updated_at = ? WHERE user_id = ?`
          ).bind(
            body.vault.ciphertext,
            body.vault.salt,
            body.vault.iv,
            body.vault.kdf,
            body.vault.version,
            Date.now(),
            userId
          ).run(),
          env.NEMO_SYNC.prepare(
            `INSERT INTO vault_metadata (user_id, version, created_at, updated_at, device_id, salt, kdf)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET
               version = excluded.version,
               updated_at = excluded.updated_at,
               device_id = excluded.device_id,
               salt = excluded.salt,
               kdf = excluded.kdf`
          ).bind(
            userId,
            body.metadata.version,
            body.metadata.createdAt,
            body.metadata.updatedAt,
            body.metadata.deviceId,
            body.metadata.salt,
            body.metadata.kdf
          ).run(),
        ]);

        return new Response(
          JSON.stringify({ success: true, updatedAt: Date.now() }),
          {
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders(origin)
            },
          }
        );
      }

      
      if (url.pathname === "/api/vault" && request.method === "HEAD") {
        const vault = await env.NEMO_SYNC.prepare(
          `SELECT 1 FROM vaults WHERE user_id = ? AND ciphertext IS NOT NULL`
        ).bind(userId).first();

        return new Response(null, {
          status: vault ? 200 : 404,
          headers: corsHeaders(origin),
        });
      }

      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        }
      );
    }
  },
};
