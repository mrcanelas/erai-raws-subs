import { getCredentialsByToken } from "../config/store.js";
import type { EraiClient } from "./client.js";
import { getEraiClientForToken } from "./pool.js";
import { getEraiClient } from "./singleton.js";

export class UnknownConfigTokenError extends Error {
  constructor(token: string) {
    super(`Unknown addon config token: ${token.slice(0, 6)}…`);
    this.name = "UnknownConfigTokenError";
  }
}

/**
 * Resolves the Erai client for a request.
 * - With a valid token: per-tenant client using stored credentials.
 * - Without a token: falls back to the env-configured client (dev/single-tenant).
 */
export async function resolveEraiClient(
  token?: string,
): Promise<EraiClient> {
  if (token) {
    const credentials = await getCredentialsByToken(token);
    if (!credentials) {
      throw new UnknownConfigTokenError(token);
    }
    return getEraiClientForToken(token, credentials);
  }

  return getEraiClient();
}
