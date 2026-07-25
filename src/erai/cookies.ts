import { CookieJar } from "tough-cookie";
import { prisma } from "../db/client.js";
import { logger } from "../utils/logger.js";

/**
 * Loads a CookieJar from Postgres (Beamup has no durable filesystem).
 * `sessionId` is the configure token or `"env"` for the crawler client.
 */
export async function loadCookieJar(sessionId?: string): Promise<CookieJar> {
  if (!sessionId) {
    return new CookieJar();
  }

  try {
    const row = await prisma.eraiSession.findUnique({
      where: { id: sessionId },
    });
    if (!row?.jarJson) {
      return new CookieJar();
    }

    const jar = CookieJar.fromJSON(row.jarJson);
    logger.info("cookie jar loaded", { sessionId });
    return jar;
  } catch (error) {
    logger.warn("failed to load cookie jar; starting fresh", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    return new CookieJar();
  }
}

export async function saveCookieJar(
  jar: CookieJar,
  sessionId?: string,
): Promise<void> {
  if (!sessionId) {
    return;
  }

  const serialized = jar.toJSON();
  if (!serialized) {
    logger.warn("cookie jar serialization returned empty", { sessionId });
    return;
  }

  const jarJson = JSON.stringify(serialized);
  await prisma.eraiSession.upsert({
    where: { id: sessionId },
    create: { id: sessionId, jarJson },
    update: { jarJson },
  });
  logger.debug("cookie jar saved", { sessionId });
}

export async function hasWordPressLoginCookie(
  jar: CookieJar,
  baseUrl: string,
): Promise<boolean> {
  const cookies = await jar.getCookies(baseUrl);
  return cookies.some((cookie) => cookie.key.startsWith("wordpress_logged_in"));
}
