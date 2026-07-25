import { gunzipSync, gzipSync } from "node:zlib";
import type { Subtitle } from "@prisma/client";
import { prisma } from "../db/client.js";
import { downloadSubtitle } from "../erai/downloader.js";
import type { EraiClient } from "../erai/client.js";
import { logger } from "../utils/logger.js";
import { LruCache } from "./lru.js";

const COMPRESSION_GZIP = "gzip";

function memoryCacheEnabled(): boolean {
  const raw = process.env.MEMORY_CACHE_ENABLED?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "no") {
    return false;
  }
  return true;
}

function memoryCacheMaxEntries(): number {
  const parsed = Number(process.env.MEMORY_CACHE_MAX_ENTRIES ?? "500");
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 500;
}

const memoryCache = new LruCache<Buffer>(memoryCacheMaxEntries());

function decompress(content: Buffer, compression: string): Buffer {
  if (compression === COMPRESSION_GZIP) {
    return gunzipSync(content);
  }
  throw new Error(`Unsupported subtitle compression: ${compression}`);
}

function compress(buffer: Buffer): { content: Buffer; compression: string; size: number } {
  const content = gzipSync(buffer);
  return {
    content,
    compression: COMPRESSION_GZIP,
    size: content.byteLength,
  };
}

async function loadFromPostgres(cacheId: string): Promise<Buffer | null> {
  const row = await prisma.subtitleCache.findUnique({ where: { id: cacheId } });
  if (!row) {
    return null;
  }

  void prisma.subtitleCache
    .update({
      where: { id: cacheId },
      data: { lastAccessedAt: new Date() },
    })
    .catch(() => undefined);

  return decompress(Buffer.from(row.content), row.compression);
}

async function storeInPostgres(
  subtitleId: string,
  buffer: Buffer,
): Promise<string> {
  const packed = compress(buffer);

  const created = await prisma.$transaction(async (tx) => {
    const cache = await tx.subtitleCache.create({
      data: {
        content: new Uint8Array(packed.content),
        compression: packed.compression,
        size: packed.size,
      },
    });

    const previous = await tx.subtitle.findUnique({
      where: { id: subtitleId },
      select: { cacheId: true },
    });

    await tx.subtitle.update({
      where: { id: subtitleId },
      data: {
        cacheId: cache.id,
        lastVerified: new Date(),
      },
    });

    if (previous?.cacheId && previous.cacheId !== cache.id) {
      await tx.subtitleCache
        .delete({ where: { id: previous.cacheId } })
        .catch(() => undefined);
    }

    return cache;
  });

  return created.id;
}

export type CachedSubtitle = {
  buffer: Buffer;
  fromCache: boolean;
};

/**
 * Returns decompressed ASS bytes, using memory → Postgres → Erai.
 * Never writes to the local filesystem (Beamup is ephemeral).
 */
export async function ensureSubtitleCached(
  client: EraiClient,
  subtitle: Subtitle,
): Promise<CachedSubtitle> {
  if (memoryCacheEnabled()) {
    const hit = memoryCache.get(subtitle.id);
    if (hit) {
      logger.info("cache hit", { layer: "memory", subtitleId: subtitle.id });
      return { buffer: hit, fromCache: true };
    }
  }

  if (subtitle.cacheId) {
    const fromDb = await loadFromPostgres(subtitle.cacheId);
    if (fromDb) {
      logger.info("cache hit", { layer: "postgres", subtitleId: subtitle.id });
      if (memoryCacheEnabled()) {
        memoryCache.set(subtitle.id, fromDb);
      }
      return { buffer: fromDb, fromCache: true };
    }
    logger.warn("cache marked but row missing; re-downloading", {
      subtitleId: subtitle.id,
      cacheId: subtitle.cacheId,
    });
  }

  logger.info("cache miss", {
    subtitleId: subtitle.id,
    downloadUrl: subtitle.downloadUrl,
  });

  const downloaded = await downloadSubtitle(client, subtitle.downloadUrl);
  await storeInPostgres(subtitle.id, downloaded.buffer);

  if (memoryCacheEnabled()) {
    memoryCache.set(subtitle.id, downloaded.buffer);
  }

  return { buffer: downloaded.buffer, fromCache: false };
}

/** Test helper — clears the in-process LRU. */
export function clearMemorySubtitleCache(): void {
  memoryCache.clear();
}
