import type { Anime, Prisma, PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger.js";
import { MetadataResolver } from "./resolver.js";
import type { ResolvedMetadata } from "./types.js";

export type EnrichStats = {
  scanned: number;
  updated: number;
  unresolved: number;
  skipped: number;
  errors: number;
};

function asStringArray(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

function mergeAliases(
  existing: Prisma.JsonValue,
  extras: string[],
): string[] {
  const merged = new Set<string>();
  for (const value of [...asStringArray(existing), ...extras]) {
    const trimmed = value.trim();
    if (trimmed) {
      merged.add(trimmed);
    }
  }
  return [...merged];
}

export type EnrichOptions = {
  /** Only rows missing IMDb (default true). */
  missingImdbOnly?: boolean;
  limit?: number;
  delayMs?: number;
};

export async function enrichAnimeMetadata(
  db: PrismaClient,
  resolver: MetadataResolver = new MetadataResolver(),
  options: EnrichOptions = {},
): Promise<EnrichStats> {
  const missingImdbOnly = options.missingImdbOnly ?? true;
  const delayMs = options.delayMs ?? 250;

  const where: Prisma.AnimeWhereInput = missingImdbOnly
    ? { OR: [{ imdb: null }, { kitsu: null }] }
    : {};

  const rows = await db.anime.findMany({
    where,
    orderBy: { canonicalTitle: "asc" },
    take: options.limit,
  });

  const stats: EnrichStats = {
    scanned: rows.length,
    updated: 0,
    unresolved: 0,
    skipped: 0,
    errors: 0,
  };

  logger.info("metadata enrich started", {
    scanned: rows.length,
    missingImdbOnly,
  });

  for (const anime of rows) {
    try {
      if (anime.imdb && anime.kitsu) {
        stats.skipped += 1;
        continue;
      }

      const resolved = await resolver.resolve(anime.canonicalTitle, {
        imdb: anime.imdb ?? undefined,
        kitsu: anime.kitsu ?? undefined,
        anilist: anime.anilist ?? undefined,
        mal: anime.mal ?? undefined,
        tmdb: anime.tmdb ?? undefined,
        tvdb: anime.tvdb ?? undefined,
        canonicalTitle: anime.canonicalTitle,
        aliases: asStringArray(anime.aliases),
        startDate: anime.startDate ?? undefined,
        episodeCount: anime.episodeCount ?? undefined,
        source: "local",
      });

      if (!resolved) {
        stats.unresolved += 1;
        continue;
      }

      // Local hit with nothing new to write.
      if (resolved.source === "local" && anime.imdb && anime.kitsu) {
        stats.skipped += 1;
        continue;
      }

      const imdbSeason = await resolver.imdbSeasonForKitsu(
        resolved.kitsu ?? anime.kitsu ?? undefined,
      );

      const updated = await applyMetadata(db, anime, resolved, imdbSeason);
      if (updated) {
        stats.updated += 1;
      } else {
        stats.skipped += 1;
      }
    } catch (error) {
      stats.errors += 1;
      logger.error("metadata enrich failed", {
        animeId: anime.id,
        title: anime.canonicalTitle,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  logger.info("metadata enrich finished", { ...stats });
  return stats;
}

async function applyMetadata(
  db: PrismaClient,
  anime: Anime,
  resolved: ResolvedMetadata,
  imdbSeason: number | undefined,
): Promise<boolean> {
  const data: Prisma.AnimeUpdateInput = {};

  if (resolved.imdb && resolved.imdb !== anime.imdb) {
    data.imdb = resolved.imdb;
  }
  if (resolved.kitsu && resolved.kitsu !== anime.kitsu) {
    data.kitsu = resolved.kitsu;
  }
  if (resolved.anilist && resolved.anilist !== anime.anilist) {
    data.anilist = resolved.anilist;
  }
  if (resolved.mal && resolved.mal !== anime.mal) {
    data.mal = resolved.mal;
  }
  if (resolved.tmdb && resolved.tmdb !== anime.tmdb) {
    data.tmdb = resolved.tmdb;
  }
  if (resolved.tvdb && resolved.tvdb !== anime.tvdb) {
    data.tvdb = resolved.tvdb;
  }
  if (resolved.startDate && !anime.startDate) {
    data.startDate = resolved.startDate;
  }
  if (resolved.episodeCount && !anime.episodeCount) {
    data.episodeCount = resolved.episodeCount;
  }
  if (imdbSeason !== undefined && anime.imdbSeason !== imdbSeason) {
    data.imdbSeason = imdbSeason;
  }

  const aliases = mergeAliases(anime.aliases, resolved.aliases);
  if (aliases.length !== asStringArray(anime.aliases).length) {
    data.aliases = aliases;
  }

  if (Object.keys(data).length === 0) {
    return false;
  }

  try {
    await db.anime.update({ where: { id: anime.id }, data });
  } catch (error) {
    // Unique collisions on kitsu/anilist/mal — keep going without that field.
    const message = error instanceof Error ? error.message : String(error);
    if (!/Unique constraint failed/i.test(message)) {
      throw error;
    }
    logger.warn("metadata unique collision; retrying without conflicting ids", {
      animeId: anime.id,
      title: anime.canonicalTitle,
      error: message,
    });
    delete data.kitsu;
    delete data.anilist;
    delete data.mal;
    delete data.tmdb;
    delete data.tvdb;
    if (Object.keys(data).length === 0) {
      return false;
    }
    await db.anime.update({ where: { id: anime.id }, data });
  }

  if (imdbSeason !== undefined) {
    await db.subtitle.updateMany({
      where: { animeId: anime.id },
      data: { season: imdbSeason },
    });
  }

  logger.info("anime metadata updated", {
    animeId: anime.id,
    title: anime.canonicalTitle,
    imdb: resolved.imdb ?? anime.imdb,
    kitsu: resolved.kitsu ?? anime.kitsu,
    imdbSeason,
    source: resolved.source,
  });

  return true;
}
