import got from "got";
import { logger } from "../utils/logger.js";
import { bestTitleMatch } from "./normalize.js";

const KITSU_BASE = "https://kitsu.io/api/edge";

export type KitsuAnime = {
  id: string;
  canonicalTitle: string;
  titles: string[];
  slug?: string;
  startDate?: string;
  episodeCount?: number;
};

type KitsuListResponse = {
  data?: Array<{
    id: string;
    attributes?: {
      slug?: string;
      canonicalTitle?: string;
      titles?: Record<string, string | null | undefined>;
      abbreviatedTitles?: string[] | null;
      startDate?: string | null;
      episodeCount?: number | null;
    };
  }>;
};

function collectTitles(
  attributes: NonNullable<KitsuListResponse["data"]>[number]["attributes"],
): string[] {
  if (!attributes) {
    return [];
  }

  const titles = new Set<string>();
  if (attributes.canonicalTitle) {
    titles.add(attributes.canonicalTitle);
  }
  if (attributes.slug) {
    titles.add(attributes.slug.replace(/-/g, " "));
  }
  for (const value of Object.values(attributes.titles ?? {})) {
    if (value) {
      titles.add(value);
    }
  }
  for (const value of attributes.abbreviatedTitles ?? []) {
    if (value) {
      titles.add(value);
    }
  }
  return [...titles];
}

function toKitsuAnime(
  row: NonNullable<KitsuListResponse["data"]>[number],
): KitsuAnime {
  const attributes = row.attributes;
  return {
    id: row.id,
    canonicalTitle: attributes?.canonicalTitle ?? row.id,
    titles: collectTitles(attributes),
    slug: attributes?.slug,
    startDate: attributes?.startDate ?? undefined,
    episodeCount: attributes?.episodeCount ?? undefined,
  };
}

export async function searchKitsuAnime(
  title: string,
  limit = 8,
): Promise<KitsuAnime[]> {
  const url = `${KITSU_BASE}/anime`;
  logger.debug("kitsu search", { title, limit });

  const response = await got(url, {
    searchParams: {
      "filter[text]": title,
      "page[limit]": String(limit),
    },
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
    },
    responseType: "json",
    timeout: { request: 20_000 },
  }).json<KitsuListResponse>();

  return (response.data ?? []).map(toKitsuAnime);
}

export async function matchKitsuAnime(
  title: string,
): Promise<KitsuAnime | undefined> {
  const results = await searchKitsuAnime(title);
  return bestTitleMatch(title, results, (anime) => anime.titles, 70);
}
