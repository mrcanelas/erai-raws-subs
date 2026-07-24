import got from "got";
import { logger } from "../utils/logger.js";
import { bestTitleMatch } from "./normalize.js";

const ANILIST_URL = "https://graphql.anilist.co";

export type AniListAnime = {
  id: string;
  mal?: string;
  imdb?: string;
  canonicalTitle: string;
  titles: string[];
  startDate?: Date;
  episodeCount?: number;
};

type AniListMedia = {
  id: number;
  idMal?: number | null;
  title?: {
    romaji?: string | null;
    english?: string | null;
    native?: string | null;
  } | null;
  synonyms?: string[] | null;
  episodes?: number | null;
  startDate?: {
    year?: number | null;
    month?: number | null;
    day?: number | null;
  } | null;
  externalLinks?: Array<{ site?: string | null; url?: string | null }> | null;
};

type AniListResponse = {
  data?: {
    Page?: {
      media?: AniListMedia[] | null;
    } | null;
  };
  errors?: Array<{ message?: string }>;
};

const SEARCH_QUERY = `query ($search: String, $perPage: Int) {
  Page(page: 1, perPage: $perPage) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      id
      idMal
      title { romaji english native }
      synonyms
      episodes
      startDate { year month day }
      externalLinks { site url }
    }
  }
}`;

function imdbFromLinks(
  links: AniListMedia["externalLinks"],
): string | undefined {
  for (const link of links ?? []) {
    const url = link?.url ?? "";
    const match = url.match(/imdb\.com\/title\/(tt\d+)/i);
    if (match) {
      return match[1];
    }
    if (link?.site?.toLowerCase() === "imdb" && link.url) {
      const idMatch = link.url.match(/(tt\d+)/i);
      if (idMatch) {
        return idMatch[1];
      }
    }
  }
  return undefined;
}

function startDateFromParts(
  parts: AniListMedia["startDate"],
): Date | undefined {
  if (!parts?.year || !parts.month || !parts.day) {
    return undefined;
  }
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function collectTitles(media: AniListMedia): string[] {
  const titles = new Set<string>();
  for (const value of [
    media.title?.romaji,
    media.title?.english,
    media.title?.native,
    ...(media.synonyms ?? []),
  ]) {
    if (value) {
      titles.add(value);
    }
  }
  return [...titles];
}

function toAniListAnime(media: AniListMedia): AniListAnime {
  const titles = collectTitles(media);
  return {
    id: String(media.id),
    mal: media.idMal ? String(media.idMal) : undefined,
    imdb: imdbFromLinks(media.externalLinks),
    canonicalTitle:
      media.title?.english ?? media.title?.romaji ?? String(media.id),
    titles,
    startDate: startDateFromParts(media.startDate),
    episodeCount: media.episodes ?? undefined,
  };
}

export async function searchAniListAnime(
  title: string,
  limit = 8,
): Promise<AniListAnime[]> {
  logger.debug("anilist search", { title, limit });

  const response = await got
    .post(ANILIST_URL, {
      json: {
        query: SEARCH_QUERY,
        variables: { search: title, perPage: limit },
      },
      responseType: "json",
      timeout: { request: 20_000 },
    })
    .json<AniListResponse>();

  if (response.errors?.length) {
    throw new Error(
      `AniList error: ${response.errors.map((e) => e.message).join("; ")}`,
    );
  }

  return (response.data?.Page?.media ?? []).map(toAniListAnime);
}

export async function matchAniListAnime(
  title: string,
): Promise<AniListAnime | undefined> {
  const results = await searchAniListAnime(title);
  return bestTitleMatch(title, results, (anime) => anime.titles, 70);
}
