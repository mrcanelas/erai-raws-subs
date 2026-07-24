import { logger } from "../utils/logger.js";
import { matchAniListAnime } from "./anilist.js";
import {
  type ImdbMappingIndex,
  loadImdbMapping,
  lookupMappingByKitsuId,
  lookupMappingByTitle,
} from "./imdb-mapping.js";
import { matchKitsuAnime } from "./kitsu.js";
import type { ResolvedMetadata } from "./types.js";

function uniqueTitles(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const titles: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    titles.push(trimmed);
  }
  return titles;
}

function parseStartDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export type MetadataResolverOptions = {
  mapping?: ImdbMappingIndex;
  /** Skip remote Kitsu/AniList calls (tests / offline). */
  offline?: boolean;
};

/**
 * Resolves external IDs for an Erai title.
 * Never called from Stremio subtitle request handlers.
 *
 * Priority: local caller cache → imdb_mapping title → Kitsu → mapping by
 * kitsu id → AniList.
 */
export class MetadataResolver {
  private mappingPromise: Promise<ImdbMappingIndex> | null = null;

  constructor(private readonly options: MetadataResolverOptions = {}) {}

  private async mapping(): Promise<ImdbMappingIndex> {
    if (this.options.mapping) {
      return this.options.mapping;
    }
    if (!this.mappingPromise) {
      this.mappingPromise = loadImdbMapping();
    }
    return this.mappingPromise;
  }

  async resolve(
    title: string,
    existing?: Partial<ResolvedMetadata>,
  ): Promise<ResolvedMetadata | null> {
    const query = title.trim();
    if (!query) {
      return null;
    }

    // Fully mapped rows stay local — never hit remote APIs during enrich loops.
    if (existing?.imdb && existing?.kitsu) {
      return {
        imdb: existing.imdb,
        kitsu: existing.kitsu,
        anilist: existing.anilist,
        mal: existing.mal,
        tmdb: existing.tmdb,
        tvdb: existing.tvdb,
        canonicalTitle: existing.canonicalTitle ?? query,
        aliases: uniqueTitles([...(existing.aliases ?? []), query]),
        startDate: existing.startDate,
        episodeCount: existing.episodeCount,
        source: "local",
      };
    }

    const mapping = await this.mapping();
    let resolved: ResolvedMetadata = {
      imdb: existing?.imdb,
      kitsu: existing?.kitsu,
      anilist: existing?.anilist,
      mal: existing?.mal,
      tmdb: existing?.tmdb,
      tvdb: existing?.tvdb,
      canonicalTitle: existing?.canonicalTitle ?? query,
      aliases: uniqueTitles([...(existing?.aliases ?? []), query]),
      startDate: existing?.startDate,
      episodeCount: existing?.episodeCount,
      source: "local",
    };

    if (!resolved.imdb || !resolved.kitsu) {
      const byTitle = lookupMappingByTitle(mapping, query);
      if (byTitle) {
        resolved = {
          ...resolved,
          imdb: resolved.imdb ?? byTitle.imdb_id,
          kitsu: resolved.kitsu ?? String(byTitle.kitsu_id),
          canonicalTitle: byTitle.title,
          aliases: uniqueTitles([...resolved.aliases, byTitle.title]),
          source: "imdb_mapping",
        };
        logger.info("metadata resolved via imdb_mapping title", {
          title: query,
          imdb: resolved.imdb,
          kitsu: resolved.kitsu,
        });
      }
    }

    if ((!resolved.imdb || !resolved.kitsu) && !this.options.offline) {
      const kitsu = await matchKitsuAnime(query);
      if (kitsu) {
        const byKitsu = lookupMappingByKitsuId(mapping, kitsu.id);
        resolved = {
          ...resolved,
          kitsu: resolved.kitsu ?? kitsu.id,
          imdb: resolved.imdb ?? byKitsu?.imdb_id,
          canonicalTitle: kitsu.canonicalTitle,
          aliases: uniqueTitles([
            ...resolved.aliases,
            kitsu.canonicalTitle,
            ...kitsu.titles,
          ]),
          startDate: resolved.startDate ?? parseStartDate(kitsu.startDate),
          episodeCount: resolved.episodeCount ?? kitsu.episodeCount,
          source: byKitsu ? "imdb_mapping" : "kitsu",
        };

        logger.info("metadata resolved via kitsu", {
          title: query,
          kitsu: resolved.kitsu,
          imdb: resolved.imdb,
          source: resolved.source,
        });
      }
    }

    if (
      !this.options.offline &&
      (!resolved.imdb || !resolved.anilist || !resolved.mal)
    ) {
      try {
        const anilist = await matchAniListAnime(query);
        if (anilist) {
          const hadImdb = Boolean(resolved.imdb);
          resolved = {
            ...resolved,
            anilist: resolved.anilist ?? anilist.id,
            mal: resolved.mal ?? anilist.mal,
            imdb: resolved.imdb ?? anilist.imdb,
            aliases: uniqueTitles([...resolved.aliases, ...anilist.titles]),
            startDate: resolved.startDate ?? anilist.startDate,
            episodeCount: resolved.episodeCount ?? anilist.episodeCount,
            source: hadImdb || resolved.source !== "local" ? resolved.source : "anilist",
          };

          if (resolved.source === "anilist") {
            logger.info("metadata resolved via anilist", {
              title: query,
              anilist: resolved.anilist,
              imdb: resolved.imdb,
              mal: resolved.mal,
            });
          }
        }
      } catch (error) {
        logger.warn("anilist enrichment failed", {
          title: query,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (!resolved.imdb && !resolved.kitsu && !resolved.anilist) {
      logger.warn("metadata unresolved", { title: query });
      return null;
    }

    return resolved;
  }

  /**
   * fromSeason for a kitsu id, when the mapping describes multi-season IMDb.
   */
  async imdbSeasonForKitsu(
    kitsuId: string | undefined,
  ): Promise<number | undefined> {
    if (!kitsuId) {
      return undefined;
    }
    const mapping = await this.mapping();
    return lookupMappingByKitsuId(mapping, kitsuId)?.fromSeason;
  }
}
