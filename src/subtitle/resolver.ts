import type { ContentTypeSchema, SubtitleSchema } from "@stremio-addon/zod";
import { getConfigByToken } from "../config/store.js";
import { prisma } from "../db/client.js";
import { logger } from "../utils/logger.js";
import { publicBaseUrl } from "../utils/url.js";
import { applyLanguagePreferences } from "./preferences.js";

export type ResolveSubtitlesArgs = {
  type: ContentTypeSchema;
  imdbId: string;
  season?: number;
  episode?: number;
  /** Tenant token embedded in proxy URLs so the proxy can pick credentials. */
  token?: string;
};

function proxyPath(id: string, token?: string): string {
  // Trailing .ass is required for stremio-video ASS track detection
  // (see subtitleTypes.hasASSExtension in the ass-support fork).
  return token
    ? `/subtitle/${encodeURIComponent(token)}/${id}.ass`
    : `/subtitle/${id}.ass`;
}

/**
 * Resolves subtitles from the local index only.
 * Never crawls Erai during Stremio requests.
 */
export async function resolveSubtitles(
  args: ResolveSubtitlesArgs,
): Promise<SubtitleSchema[]> {
  // Multiple Erai folders (e.g. S1/S2) may share one IMDb id.
  const animeRows = await prisma.anime.findMany({
    where: { imdb: args.imdbId },
    select: { id: true },
  });

  if (animeRows.length === 0) {
    logger.info("subtitle miss: no anime for imdb", { imdbId: args.imdbId });
    return [];
  }

  const season = args.season ?? 1;
  const episode = args.episode ?? null;

  const rows = await prisma.subtitle.findMany({
    where: {
      animeId: { in: animeRows.map((row) => row.id) },
      season,
      ...(episode === null ? {} : { episode }),
    },
    orderBy: [{ language: "asc" }, { fileName: "asc" }],
  });

  const baseUrl = publicBaseUrl();

  // `label` is supported by stremio-core (optional) and is what the player
  // menu displays when present. Official zod schema omits it, so we extend.
  const mapped: Array<SubtitleSchema & { label: string }> = rows.map(
    (row) => ({
      // fileName in id/label helps users pick between same-language tracks.
      id: row.fileName,
      lang: row.language,
      label: row.fileName,
      // Proxy lookup still uses the stable internal cuid; the tenant token
      // (when present) lets the proxy authenticate with the right account.
      url: `${baseUrl}${proxyPath(row.id, args.token)}`,
    }),
  );

  const prefs = args.token
    ? await getConfigByToken(args.token).then((config) =>
        config
          ? {
              preferredLanguage: config.preferredLanguage,
              preferredOnly: config.preferredOnly,
            }
          : undefined,
      )
    : undefined;

  const subtitles = applyLanguagePreferences(mapped, prefs);

  logger.info("subtitle hit", {
    imdbId: args.imdbId,
    season,
    episode,
    count: subtitles.length,
    preferredLanguage: prefs?.preferredLanguage,
    preferredOnly: prefs?.preferredOnly,
  });

  return subtitles;
}
