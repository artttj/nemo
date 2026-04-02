export const DEFAULT_SYNC_SERVER = "https://your-worker.workers.dev"; // Replace with your Cloudflare D1 worker URL

export const SYNC_CONFIG = {
  DEFAULT_SERVER: DEFAULT_SYNC_SERVER,
  API_VERSION: "v1",
  ENDPOINTS: {
    REGISTER: "/api/register",
    VAULT: "/api/vault",
    HEALTH: "/health"
  }
};
