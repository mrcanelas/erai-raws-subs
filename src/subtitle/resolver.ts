import type { ContentTypeSchema, SubtitleSchema } from "@stremio-addon/zod";
import { prisma } from "../db/client.js";
import { logger } from "../utils/logger.js";

export type ResolveSubtitlesArgs = {
  type: ContentTypeSchema;
  imdbId: string;
  season?: number;
  episode?: number;
};

function publicBaseUrl(): string {
  const configured = process.env.ADDON_PUBLIC_URL?.replace(/\/+$/, "");
  if (configured) {
    return configured;
  }

  const port = Number(process.env.PORT) || 7000;
  return `http://127.0.0.1:${port}`;
}

/**
 * Resolves subtitles from the local index only.
 * Never crawls Erai during Stremio requests.
 */
export async function resolveSubtitles(
  args: ResolveSubtitlesArgs,
): Promise<SubtitleSchema[]> {
  const anime = await prisma.anime.findUnique({
    where: { imdb: args.imdbId },
  });

  if (!anime) {
    logger.info("subtitle miss: no anime for imdb", { imdbId: args.imdbId });
    return [];
  }

  const season = args.season ?? 1;
  const episode = args.episode ?? null;

  const rows = await prisma.subtitle.findMany({
    where: {
      animeId: anime.id,
      season,
      ...(episode === null ? {} : { episode }),
    },
    orderBy: [{ language: "asc" }, { fileName: "asc" }],
  });

  const baseUrl = publicBaseUrl();

  // `label` is supported by stremio-core (optional) and is what the player
  // menu displays when present. Official zod schema omits it, so we extend.
  const subtitles: Array<SubtitleSchema & { label: string }> = rows.map(
    (row) => ({
      id: row.id,
      lang: row.language,
      label: row.fileName,
      // Trailing .ass is required for stremio-video ASS track detection
      // (see subtitleTypes.hasASSExtension in the ass-support fork).
      // Proxy lookup still uses the stable internal cuid.
      url: `${baseUrl}/subtitle/${row.id}.ass`,
    }),
  );

  logger.info("subtitle hit", {
    imdbId: args.imdbId,
    season,
    episode,
    count: subtitles.length,
  });

  return subtitles;
}
