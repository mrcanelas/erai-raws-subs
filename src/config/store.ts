import { prisma } from "../db/client.js";
import type { EraiCredentials } from "../erai/types.js";
import { logger } from "../utils/logger.js";
import { decryptJson, encryptJson, generateToken } from "./crypto.js";

export type AddonUserPreferences = {
  preferredLanguage?: string;
  preferredOnly?: boolean;
};

export type AddonConfigPayload = EraiCredentials & AddonUserPreferences;

/**
 * Persists Erai credentials (and optional preferences) encrypted at rest.
 * Returns an opaque token — the only value that reaches Stremio clients.
 */
export async function createAddonConfig(
  payload: AddonConfigPayload,
): Promise<string> {
  const token = generateToken();
  const encrypted = encryptJson(payload);

  await prisma.addonConfig.create({
    data: {
      token,
      secret: encrypted.secret,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
    },
  });

  logger.info("addon config created", { token: token.slice(0, 6) });
  return token;
}

export async function getConfigByToken(
  token: string,
): Promise<AddonConfigPayload | null> {
  const row = await prisma.addonConfig.findUnique({ where: { token } });
  if (!row) {
    return null;
  }

  try {
    const payload = decryptJson<AddonConfigPayload>({
      secret: row.secret,
      iv: row.iv,
      authTag: row.authTag,
    });

    void prisma.addonConfig
      .update({ where: { token }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    return payload;
  } catch (error) {
    logger.error("failed to decrypt addon config", {
      token: token.slice(0, 6),
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function getCredentialsByToken(
  token: string,
): Promise<EraiCredentials | null> {
  const payload = await getConfigByToken(token);
  if (!payload?.username || !payload.password) {
    return null;
  }

  return {
    username: payload.username,
    password: payload.password,
  };
}
