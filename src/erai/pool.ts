import path from "node:path";
import { EraiClient } from "./client.js";
import type { EraiCredentials } from "./types.js";

const clients = new Map<string, Promise<EraiClient>>();

function cookiePathForToken(token: string): string {
  const base = process.env.ERAI_COOKIE_DIR ?? ".cache";
  // Sanitize so the token can't escape the cache directory.
  const safe = token.replace(/[^A-Za-z0-9_-]/g, "");
  return path.join(base, `erai-cookies-${safe}.json`);
}

/**
 * Returns a cached authenticated client for a tenant token. Each token keeps
 * its own CookieJar so sessions never mix between users.
 */
export function getEraiClientForToken(
  token: string,
  credentials: EraiCredentials,
): Promise<EraiClient> {
  const existing = clients.get(token);
  if (existing) {
    return existing;
  }

  const created = EraiClient.create({
    baseUrl: process.env.ERAI_BASE_URL,
    credentials,
    cookiePath: cookiePathForToken(token),
  }).then(async (client) => {
    await client.init();
    return client;
  });

  clients.set(token, created);

  // Drop failed attempts so the next request can retry a fresh login.
  created.catch(() => {
    if (clients.get(token) === created) {
      clients.delete(token);
    }
  });

  return created;
}

export function clearEraiClientPool(): void {
  clients.clear();
}
