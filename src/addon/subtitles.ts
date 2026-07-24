import type {
  ContentTypeSchema,
  SubtitlesResponseSchema,
} from "@stremio-addon/zod";
import {
  resolveSubtitles,
  type ResolveSubtitlesArgs,
} from "../subtitle/resolver.js";
import { logger } from "../utils/logger.js";

export type ParsedSubtitleId = {
  imdbId: string;
  season?: number;
  episode?: number;
};

export type { ResolveSubtitlesArgs };

/**
 * Parses Stremio video ids:
 * - movie:  tt1234567
 * - series: tt1234567:season:episode
 */
export function parseSubtitleId(id: string): ParsedSubtitleId | null {
  const match = id.match(/^(tt\d+)(?::(\d+):(\d+))?$/);
  if (!match) {
    return null;
  }

  const [, imdbId, seasonRaw, episodeRaw] = match;

  if (seasonRaw !== undefined && episodeRaw !== undefined) {
    return {
      imdbId,
      season: Number(seasonRaw),
      episode: Number(episodeRaw),
    };
  }

  return { imdbId };
}

export async function handleSubtitlesRequest(args: {
  type: ContentTypeSchema;
  id: string;
}): Promise<SubtitlesResponseSchema> {
  const parsed = parseSubtitleId(args.id);

  if (!parsed) {
    logger.warn("subtitle lookup skipped: invalid id", {
      type: args.type,
      id: args.id,
    });
    return { subtitles: [] };
  }

  logger.info("subtitle lookup", {
    type: args.type,
    imdbId: parsed.imdbId,
    season: parsed.season,
    episode: parsed.episode,
  });

  const subtitles = await resolveSubtitles({
    type: args.type,
    imdbId: parsed.imdbId,
    season: parsed.season,
    episode: parsed.episode,
  });

  return { subtitles };
}
