import { EraiClient } from "./client.js";
import { hasWordPressLoginCookie } from "./cookies.js";
import { logger } from "../utils/logger.js";

async function main(): Promise<void> {
  const username = process.env.ERAI_USERNAME;
  const password = process.env.ERAI_PASSWORD;

  if (!username || !password) {
    throw new Error("Set ERAI_USERNAME and ERAI_PASSWORD in the environment");
  }

  const client = await EraiClient.create({
    credentials: { username, password },
    cookiePath: process.env.ERAI_COOKIE_PATH ?? ".cache/erai-cookies.json",
  });

  await client.init();

  const loggedIn = await hasWordPressLoginCookie(client.jar, client.baseUrl);
  logger.info("login smoke test", { loggedIn });

  const html = await client.getHtml("/");
  logger.info("home page fetched", {
    bytes: html.length,
    hasLoginForm: /name=["']log["']/i.test(html),
  });
}

main().catch((error: unknown) => {
  logger.error("login smoke test failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
});
