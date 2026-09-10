import type { Anime, PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger.js";
import type { EraiClient } from "../erai/client.js";
import {
  enrichAnimeMetadata,
  MetadataResolver,
} from "../metadata/index.js";
import { episodeFromPathAndFile } from "./episode.js";
import { detectLanguage } from "./language.js";
import { parseDirectoryListing } from "./parser.js";
import type { CrawlOptions, CrawlStats, DirectoryEntry } from "./types.js";

const SYNC_STATE_ID = "default";
const ASS_EXTENSIONS = /\.(?:ass|ssa)$/i;

function splitDirectory(directory: string): string[] {
  return directory.split("/").filter(Boolean);
}

function checksumFromFilename(fileName: string): string | undefined {
  const matches = [...fileName.matchAll(/\[([A-Fa-f0-9]{8})\]/g)];
  return matches.at(-1)?.[1]?.toLowerCase();
}

function downloadUrl(baseUrl: string, href: string): string {
  if (/^https?:\/\//i.test(href)) {
    return href;
  }

  const relative = href.replace(/^\/+/, "");
  return new URL(relative, `${baseUrl.replace(/\/+$/, "")}/subs/`).toString();
}

function createStats(): CrawlStats {
  return {
    directories: 0,
    anime: 0,
    files: 0,
    created: 0,
    updated: 0,
    errors: 0,
  };
}

export class EraiCrawler {
  private readonly visited = new Set<string>();
  private readonly animeCache = new Map<string, Anime>();
  private readonly animeCounted = new Set<string>();
  private readonly metadata: MetadataResolver;
  private lastRequestAt = 0;

  constructor(
    private readonly client: EraiClient,
    private readonly db: PrismaClient,
    metadata?: MetadataResolver,
  ) {
    this.metadata = metadata ?? new MetadataResolver();
  }

  async crawl(options: CrawlOptions): Promise<CrawlStats> {
    const stats = createStats();
    const rootDirectory = options.rootDirectory.replace(/\/+$/, "");
    const signal = options.signal;

    await this.updateSyncState("running", rootDirectory);
    logger.info("crawler started", {
      rootDirectory,
      delayMs: options.delayMs,
    });

    try {
      await this.walk(rootDirectory, options.delayMs, stats, signal);

      const timedOut = Boolean(signal?.aborted);
      if (!timedOut) {
        // Metadata lookups happen after indexing — never during subtitle requests.
        await enrichAnimeMetadata(this.db, this.metadata, {
          missingImdbOnly: true,
          delayMs: Math.max(options.delayMs, 200),
        });
      }

      const status = timedOut ? "idle" : stats.errors > 0 ? "error" : "idle";
      await this.db.syncState.upsert({
        where: { id: SYNC_STATE_ID },
        update: {
          status,
          lastSync: new Date(),
        },
        create: {
          id: SYNC_STATE_ID,
          status,
          lastSync: new Date(),
          lastDirectory: rootDirectory,
        },
      });

      logger.info("crawler finished", {
        rootDirectory,
        aborted: timedOut,
        ...stats,
      });
      return stats;
    } catch (error) {
      if (isAbortError(error)) {
        await this.updateSyncState("idle", rootDirectory);
        logger.info("crawler stopped by abort signal", {
          rootDirectory,
          ...stats,
        });
        return stats;
      }

      await this.updateSyncState("error", rootDirectory);
      logger.error("crawler aborted", {
        rootDirectory,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async walk(
    directory: string,
    delayMs: number,
    stats: CrawlStats,
    signal?: AbortSignal,
  ): Promise<void> {
    if (signal?.aborted) {
      return;
    }
    if (this.visited.has(directory)) {
      return;
    }
    this.visited.add(directory);

    try {
      await this.waitForRateLimit(delayMs, signal);
      if (signal?.aborted) {
        return;
      }

      const query = `subs/?dir=${encodeURIComponent(directory)}`;
      const html = await this.client.getHtml(query);
      this.lastRequestAt = Date.now();

      const entries = parseDirectoryListing(html);
      stats.directories += 1;

      await this.updateSyncState("running", directory);
      await this.ensureAnimeForDirectory(directory, stats);

      for (const entry of entries) {
        if (signal?.aborted) {
          return;
        }

        if (entry.kind === "directory") {
          await this.walk(entry.directory, delayMs, stats, signal);
          continue;
        }

        if (ASS_EXTENSIONS.test(entry.name)) {
          await this.indexFile(directory, entry, stats);
        }
      }
    } catch (error) {
      if (isAbortError(error) || signal?.aborted) {
        return;
      }
      stats.errors += 1;
      logger.error("crawler directory failed", {
        directory,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async indexFile(
    directory: string,
    entry: Extract<DirectoryEntry, { kind: "file" }>,
    stats: CrawlStats,
  ): Promise<void> {
    try {
      const parts = splitDirectory(directory);
      if (parts.length < 4 || parts[0] !== "Sub") {
        logger.warn("subtitle skipped: unexpected directory shape", {
          directory,
          fileName: entry.name,
        });
        return;
      }

      const animePath = parts.slice(0, 4).join("/");
      const anime = await this.ensureAnime(animePath, parts[3], stats);
      const releaseSegments = parts.slice(4);
      const episode = episodeFromPathAndFile(releaseSegments, entry.name);
      const language = detectLanguage(entry.name, releaseSegments);
      const now = new Date();
      const release = [parts[2], ...releaseSegments].join("/");

      const season = anime.imdbSeason ?? 1;

      const existing = await this.db.subtitle.findFirst({
        where: {
          animeId: anime.id,
          season,
          episode: episode.episode,
          language,
          fileName: entry.name,
        },
      });

      const data = {
        release,
        hash: checksumFromFilename(entry.name),
        downloadUrl: downloadUrl(this.client.baseUrl, entry.href),
        lastVerified: now,
      };

      if (existing) {
        await this.db.subtitle.update({
          where: { id: existing.id },
          data,
        });
        stats.updated += 1;
      } else {
        await this.db.subtitle.create({
          data: {
            animeId: anime.id,
            season,
            episode: episode.episode,
            language,
            fileName: entry.name,
            ...data,
          },
        });
        stats.created += 1;
      }

      stats.files += 1;
      logger.debug("subtitle indexed", {
        anime: anime.canonicalTitle,
        episode: episode.episode,
        language,
        fileName: entry.name,
      });
    } catch (error) {
      stats.errors += 1;
      logger.error("subtitle indexing failed", {
        directory,
        fileName: entry.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async ensureAnimeForDirectory(
    directory: string,
    stats: CrawlStats,
  ): Promise<void> {
    const parts = splitDirectory(directory);
    if (parts.length < 4 || parts[0] !== "Sub") {
      return;
    }

    await this.ensureAnime(parts.slice(0, 4).join("/"), parts[3], stats);
  }

  private async ensureAnime(
    sourcePath: string,
    title: string,
    stats: CrawlStats,
  ): Promise<Anime> {
    const cached = this.animeCache.get(sourcePath);
    if (cached) {
      return cached;
    }

    const anime = await this.db.anime.upsert({
      where: { sourcePath },
      update: { canonicalTitle: title },
      create: {
        sourcePath,
        canonicalTitle: title,
        aliases: [title],
      },
    });

    this.animeCache.set(sourcePath, anime);
    if (!this.animeCounted.has(sourcePath)) {
      this.animeCounted.add(sourcePath);
      stats.anime += 1;
    }

    return anime;
  }

  private async updateSyncState(
    status: "running" | "idle" | "error",
    lastDirectory: string,
  ): Promise<void> {
    await this.db.syncState.upsert({
      where: { id: SYNC_STATE_ID },
      update: { status, lastDirectory },
      create: { id: SYNC_STATE_ID, status, lastDirectory },
    });
  }

  private async waitForRateLimit(
    delayMs: number,
    signal?: AbortSignal,
  ): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    const waitMs = Math.max(0, delayMs - elapsed);
    if (waitMs <= 0) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, waitMs);

      function onAbort(): void {
        clearTimeout(timer);
        reject(new DOMException("Crawl aborted", "AbortError"));
      }

      if (signal?.aborted) {
        clearTimeout(timer);
        onAbort();
        return;
      }

      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === "AbortError") ||
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "AbortError")
  );
}
