import { promises as fs } from "node:fs";
import path from "node:path";
import type { Subtitle } from "@prisma/client";
import { prisma } from "../db/client.js";
import { downloadSubtitle } from "../erai/downloader.js";
import type { EraiClient } from "../erai/client.js";
import { logger } from "../utils/logger.js";

function cacheRoot(): string {
  return process.env.SUBTITLE_CACHE_DIR ?? ".cache/subtitles";
}

export function cachePathFor(subtitleId: string): string {
  return path.join(cacheRoot(), `${subtitleId}.ass`);
}

export async function ensureSubtitleCached(
  client: EraiClient,
  subtitle: Subtitle,
): Promise<{ absolutePath: string; fromCache: boolean }> {
  const absolutePath = subtitle.cachedPath
    ? path.resolve(subtitle.cachedPath)
    : path.resolve(cachePathFor(subtitle.id));

  if (subtitle.cached) {
    try {
      await fs.access(absolutePath);
      logger.info("cache hit", { subtitleId: subtitle.id, absolutePath });
      return { absolutePath, fromCache: true };
    } catch {
      logger.warn("cache marked but file missing; re-downloading", {
        subtitleId: subtitle.id,
        absolutePath,
      });
    }
  }

  logger.info("cache miss", {
    subtitleId: subtitle.id,
    downloadUrl: subtitle.downloadUrl,
  });

  const downloaded = await downloadSubtitle(client, subtitle.downloadUrl);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, downloaded.buffer);

  await prisma.subtitle.update({
    where: { id: subtitle.id },
    data: {
      cached: true,
      cachedPath: absolutePath,
      lastVerified: new Date(),
    },
  });

  return { absolutePath, fromCache: false };
}
