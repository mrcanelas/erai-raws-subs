import got, { type Got, type Response } from "got";
import type { CookieJar } from "tough-cookie";
import { logger } from "../utils/logger.js";
import { ensureSession, renewSession } from "./auth.js";
import { loadCookieJar, saveCookieJar } from "./cookies.js";
import {
  DEFAULT_USER_AGENT,
  ERAI_BASE_URL,
  EraiHttpError,
  type EraiClientOptions,
  type EraiCredentials,
} from "./types.js";

function looksLikeLoginPage(body: string): boolean {
  return /name=["']log["']/i.test(body) && /name=["']pwd["']/i.test(body);
}

type TextResponse = Response<string>;
type BufferResponse = Response<Buffer>;

export class EraiClient {
  readonly baseUrl: string;
  readonly jar: CookieJar;
  private readonly credentials: EraiCredentials;
  private readonly cookiePath?: string;
  private readonly http: Got;
  private ready: Promise<void> | null = null;

  private constructor(options: EraiClientOptions, jar: CookieJar) {
    this.baseUrl = options.baseUrl ?? ERAI_BASE_URL;
    this.credentials = options.credentials;
    this.cookiePath = options.cookiePath;
    this.jar = jar;

    const prefix = this.baseUrl.endsWith("/")
      ? this.baseUrl
      : `${this.baseUrl}/`;

    this.http = got.extend({
      prefixUrl: prefix,
      cookieJar: jar,
      timeout: {
        request: options.timeoutMs ?? 30_000,
      },
      headers: {
        "user-agent": options.userAgent ?? DEFAULT_USER_AGENT,
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9,pt-BR;q=0.8",
        "accept-encoding": "gzip, deflate, br",
      },
      followRedirect: true,
      http2: false,
      decompress: true,
      throwHttpErrors: false,
    });
  }

  static async create(options: EraiClientOptions): Promise<EraiClient> {
    const jar = await loadCookieJar(options.cookiePath);
    return new EraiClient(options, jar);
  }

  async init(): Promise<void> {
    if (!this.ready) {
      this.ready = ensureSession(
        this.http,
        this.jar,
        this.credentials,
        this.baseUrl,
        this.cookiePath,
      );
    }

    await this.ready;
  }

  async getHtml(pathname: string): Promise<string> {
    const response = await this.requestText(pathname);
    return response.body;
  }

  async getBuffer(pathnameOrUrl: string): Promise<Buffer> {
    const response = await this.requestBuffer(pathnameOrUrl);
    return response.body;
  }

  private resolveUrl(pathnameOrUrl: string): string {
    if (/^https?:\/\//i.test(pathnameOrUrl)) {
      return pathnameOrUrl;
    }

    return pathnameOrUrl.replace(/^\/+/, "");
  }

  private async requestText(
    pathnameOrUrl: string,
    allowRetry = true,
  ): Promise<TextResponse> {
    await this.init();

    const url = this.resolveUrl(pathnameOrUrl);
    logger.debug("erai request", { method: "GET", url });

    const response = (await this.http(url, {
      method: "GET",
      responseType: "text",
    })) as TextResponse;

    if (await this.shouldRenew(response, allowRetry)) {
      await renewSession(
        this.http,
        this.jar,
        this.credentials,
        this.baseUrl,
        this.cookiePath,
      );
      return this.requestText(pathnameOrUrl, false);
    }

    if (response.statusCode >= 400) {
      throw new EraiHttpError(response.statusCode, response.url);
    }

    await saveCookieJar(this.jar, this.cookiePath);
    return response;
  }

  private async requestBuffer(
    pathnameOrUrl: string,
    allowRetry = true,
  ): Promise<BufferResponse> {
    await this.init();

    const url = this.resolveUrl(pathnameOrUrl);
    logger.debug("erai request", { method: "GET", url });

    const response = (await this.http(url, {
      method: "GET",
      responseType: "buffer",
    })) as BufferResponse;

    if (response.statusCode === 403 || response.statusCode === 401) {
      if (!allowRetry) {
        throw new EraiHttpError(response.statusCode, response.url);
      }

      logger.warn("erai auth challenge; renewing session", {
        statusCode: response.statusCode,
        url: response.url,
      });
      await renewSession(
        this.http,
        this.jar,
        this.credentials,
        this.baseUrl,
        this.cookiePath,
      );
      return this.requestBuffer(pathnameOrUrl, false);
    }

    if (response.statusCode >= 400) {
      throw new EraiHttpError(response.statusCode, response.url);
    }

    await saveCookieJar(this.jar, this.cookiePath);
    return response;
  }

  private async shouldRenew(
    response: TextResponse,
    allowRetry: boolean,
  ): Promise<boolean> {
    if (!allowRetry) {
      return false;
    }

    if (response.statusCode === 403 || response.statusCode === 401) {
      logger.warn("erai auth challenge; renewing session", {
        statusCode: response.statusCode,
        url: response.url,
      });
      return true;
    }

    if (looksLikeLoginPage(response.body)) {
      logger.warn("erai returned login page; renewing session", {
        url: response.url,
      });
      return true;
    }

    return false;
  }
}
