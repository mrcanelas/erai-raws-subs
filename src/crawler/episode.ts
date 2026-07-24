import type { EpisodeInfo } from "./types.js";

const SINGLE_EPISODE = /^(\d{1,4})(?:v\d+)?$/i;
const EPISODE_RANGE = /^(\d{1,4})\s*(?:~|-)\s*(\d{1,4})$/;
const FILE_EPISODE = /\s-\s(\d{1,4})(?:v\d+)?(?:\s|\[|$)/i;

export function episodeFromPathAndFile(
  pathSegments: readonly string[],
  fileName: string,
): EpisodeInfo {
  for (const segment of pathSegments) {
    const match = segment.trim().match(SINGLE_EPISODE);
    if (match) {
      return {
        episode: Number(match[1]),
        descriptor: segment,
      };
    }
  }

  const fileMatch = fileName.match(FILE_EPISODE);
  if (fileMatch) {
    return {
      episode: Number(fileMatch[1]),
      descriptor: fileMatch[1],
    };
  }

  for (const segment of pathSegments) {
    if (EPISODE_RANGE.test(segment.trim())) {
      return {
        episode: null,
        descriptor: segment,
      };
    }
  }

  return { episode: null };
}
