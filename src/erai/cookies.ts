import { promises as fs } from "node:fs";
import path from "node:path";
import { CookieJar } from "tough-cookie";
import { logger } from "../utils/logger.js";

export async function loadCookieJar(cookiePath?: string): Promise<CookieJar> {
  if (!cookiePath) {
    return new CookieJar();
  }

  try {
    const raw = await fs.readFile(cookiePath, "utf8");
    const jar = CookieJar.fromJSON(raw);
    logger.info("cookie jar loaded", { cookiePath });
    return jar;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : undefined;

    if (code !== "ENOENT") {
      logger.warn("failed to load cookie jar; starting fresh", {
        cookiePath,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return new CookieJar();
  }
}

export async function saveCookieJar(
  jar: CookieJar,
  cookiePath?: string,
): Promise<void> {
  if (!cookiePath) {
    return;
  }

  await fs.mkdir(path.dirname(cookiePath), { recursive: true });
  const serialized = jar.toJSON();
  if (!serialized) {
    logger.warn("cookie jar serialization returned empty", { cookiePath });
    return;
  }
  await fs.writeFile(cookiePath, JSON.stringify(serialized, null, 2), "utf8");
  logger.debug("cookie jar saved", { cookiePath });
}

export async function hasWordPressLoginCookie(
  jar: CookieJar,
  baseUrl: string,
): Promise<boolean> {
  const cookies = await jar.getCookies(baseUrl);
  return cookies.some((cookie) => cookie.key.startsWith("wordpress_logged_in"));
}
