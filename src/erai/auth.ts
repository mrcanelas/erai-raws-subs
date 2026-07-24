import type { Got } from "got";
import type { CookieJar } from "tough-cookie";
import { logger } from "../utils/logger.js";
import {
  hasWordPressLoginCookie,
  saveCookieJar,
} from "./cookies.js";
import { EraiAuthError, type EraiCredentials } from "./types.js";

const LOGIN_PATH = "account-login/";
const LOGIN_URL_PATH = "/account-login/";

export async function login(
  http: Got,
  jar: CookieJar,
  credentials: EraiCredentials,
  baseUrl: string,
  cookiePath?: string,
): Promise<void> {
  logger.info("erai login starting");

  // Warm DDoS-Guard + wordpress_test_cookie before posting credentials.
  // got prefixUrl forbids a leading slash on the path.
  const loginPage = await http.get(LOGIN_PATH, {
    throwHttpErrors: false,
  });

  if (loginPage.statusCode >= 400) {
    throw new EraiAuthError(
      `Failed to load login page (HTTP ${loginPage.statusCode})`,
    );
  }

  const body = new URLSearchParams({
    log: credentials.username,
    pwd: credentials.password,
    rememberme: "forever",
    "wp-submit": "Log In",
    redirect_to: `${baseUrl}/wp-admin/`,
    testcookie: "1",
    // Honeypot field — must stay empty.
    website_homepage: "",
  });

  const response = await http.post(LOGIN_PATH, {
    body: body.toString(),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: baseUrl,
      referer: `${baseUrl}${LOGIN_URL_PATH}`,
    },
    followRedirect: true,
    throwHttpErrors: false,
  });

  const loggedIn = await hasWordPressLoginCookie(jar, baseUrl);

  if (!loggedIn) {
    const looksLikeLogin =
      typeof response.body === "string" &&
      /name=["']log["']/i.test(response.body) &&
      /name=["']pwd["']/i.test(response.body);

    throw new EraiAuthError(
      looksLikeLogin
        ? "Login failed: invalid credentials or session rejected"
        : `Login failed: missing wordpress_logged_in cookie (HTTP ${response.statusCode})`,
    );
  }

  await saveCookieJar(jar, cookiePath);
  logger.info("erai login succeeded", { statusCode: response.statusCode });
}

export async function ensureSession(
  http: Got,
  jar: CookieJar,
  credentials: EraiCredentials,
  baseUrl: string,
  cookiePath?: string,
): Promise<void> {
  if (await hasWordPressLoginCookie(jar, baseUrl)) {
    logger.debug("erai session cookie present");
    return;
  }

  await login(http, jar, credentials, baseUrl, cookiePath);
}

export async function renewSession(
  http: Got,
  jar: CookieJar,
  credentials: EraiCredentials,
  baseUrl: string,
  cookiePath?: string,
): Promise<void> {
  logger.warn("erai session renewing");
  await login(http, jar, credentials, baseUrl, cookiePath);
}
