export const ERAI_BASE_URL = "https://www.erai-raws.info";

export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export type EraiCredentials = {
  username: string;
  password: string;
};

export type EraiClientOptions = {
  baseUrl?: string;
  credentials: EraiCredentials;
  userAgent?: string;
  /** Optional path to persist the CookieJar as JSON between runs. */
  cookiePath?: string;
  timeoutMs?: number;
};

export class EraiAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EraiAuthError";
  }
}

export class EraiHttpError extends Error {
  readonly statusCode: number;
  readonly url: string;

  constructor(statusCode: number, url: string, message?: string) {
    super(message ?? `HTTP ${statusCode} for ${url}`);
    this.name = "EraiHttpError";
    this.statusCode = statusCode;
    this.url = url;
  }
}
