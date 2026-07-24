import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import got from "got";
import { logger } from "../utils/logger.js";
import { bestTitleMatch, normalizeTitle } from "./normalize.js";
import type { ImdbMappingEntry } from "./types.js";

const DEFAULT_MAPPING_URL =
  "https://raw.githubusercontent.com/TheBeastLT/stremio-kitsu-anime/master/static/data/imdb_mapping.json";

export type ImdbMappingIndex = {
  byKitsuId: Map<number, ImdbMappingEntry>;
  entries: ImdbMappingEntry[];
};

function mappingPath(): string {
  return (
    process.env.IMDB_MAPPING_PATH?.trim() ||
    path.join(".cache", "imdb_mapping.json")
  );
}

function mappingUrl(): string {
  return process.env.IMDB_MAPPING_URL?.trim() || DEFAULT_MAPPING_URL;
}

function isMappingEntry(value: unknown): value is ImdbMappingEntry {
  if (!value || typeof value !== "object") {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.kitsu_id === "number" &&
    typeof entry.imdb_id === "string" &&
    entry.imdb_id.length > 0 &&
    typeof entry.title === "string" &&
    entry.title.length > 0
  );
}

function parseMappingEntries(value: unknown): ImdbMappingEntry[] {
  if (!Array.isArray(value)) {
    throw new Error("imdb_mapping.json has unexpected shape");
  }

  const entries = value.filter(isMappingEntry);
  if (entries.length === 0) {
    throw new Error("imdb_mapping.json contained no usable entries");
  }
  if (entries.length !== value.length) {
    logger.warn("imdb mapping skipped invalid entries", {
      total: value.length,
      kept: entries.length,
      skipped: value.length - entries.length,
    });
  }
  return entries;
}

export function buildImdbMappingIndex(
  entries: ImdbMappingEntry[],
): ImdbMappingIndex {
  const byKitsuId = new Map<number, ImdbMappingEntry>();
  for (const entry of entries) {
    // Prefer the first entry for a kitsu id; season splits reuse titles.
    if (!byKitsuId.has(entry.kitsu_id)) {
      byKitsuId.set(entry.kitsu_id, entry);
    }
  }
  return { byKitsuId, entries };
}

export async function loadImdbMapping(
  options: { forceRefresh?: boolean } = {},
): Promise<ImdbMappingIndex> {
  const filePath = mappingPath();
  await mkdir(path.dirname(filePath), { recursive: true });

  if (!options.forceRefresh) {
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed: unknown = JSON.parse(raw);
      try {
        const entries = parseMappingEntries(parsed);
        logger.info("imdb mapping cache hit", {
          path: filePath,
          entries: entries.length,
        });
        return buildImdbMappingIndex(entries);
      } catch {
        // corrupt cache — download below
      }
    } catch {
      // download below
    }
  }

  const url = mappingUrl();
  logger.info("imdb mapping download", { url });
  const body = await got(url, {
    timeout: { request: 60_000 },
  }).json<unknown>();

  const entries = parseMappingEntries(body);

  await writeFile(filePath, JSON.stringify(entries), "utf8");
  logger.info("imdb mapping cached", {
    path: filePath,
    entries: entries.length,
  });
  return buildImdbMappingIndex(entries);
}

export function lookupMappingByKitsuId(
  index: ImdbMappingIndex,
  kitsuId: string | number,
): ImdbMappingEntry | undefined {
  const numeric = typeof kitsuId === "number" ? kitsuId : Number(kitsuId);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  return index.byKitsuId.get(numeric);
}

export function lookupMappingByTitle(
  index: ImdbMappingIndex,
  title: string,
  minScore = 90,
): ImdbMappingEntry | undefined {
  const normalized = normalizeTitle(title);
  if (!normalized) {
    return undefined;
  }

  return bestTitleMatch(
    title,
    index.entries,
    (entry) => [entry.title],
    minScore,
  );
}
