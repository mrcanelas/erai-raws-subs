/**
 * Normalizes anime titles for deterministic matching.
 * lowercase → strip accents → remove punctuation → collapse whitespace
 */
export function normalizeTitle(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titlesEqual(a: string, b: string): boolean {
  const left = normalizeTitle(a);
  const right = normalizeTitle(b);
  return left.length > 0 && left === right;
}

/**
 * Score how well a candidate title matches a query.
 * Higher is better. Exact normalized match wins.
 */
export function titleMatchScore(query: string, candidate: string): number {
  const q = normalizeTitle(query);
  const c = normalizeTitle(candidate);

  if (!q || !c) {
    return 0;
  }
  if (q === c) {
    return 100;
  }
  if (c.startsWith(q) || q.startsWith(c)) {
    const shorter = Math.min(q.length, c.length);
    const longer = Math.max(q.length, c.length);
    return 70 + Math.floor((shorter / longer) * 20);
  }
  if (c.includes(q) || q.includes(c)) {
    const shorter = Math.min(q.length, c.length);
    const longer = Math.max(q.length, c.length);
    return 40 + Math.floor((shorter / longer) * 20);
  }

  return 0;
}

export function bestTitleMatch<T>(
  query: string,
  candidates: T[],
  getTitles: (candidate: T) => string[],
  minScore = 70,
): T | undefined {
  let best: T | undefined;
  let bestScore = 0;

  for (const candidate of candidates) {
    for (const title of getTitles(candidate)) {
      const score = titleMatchScore(query, title);
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
  }

  return bestScore >= minScore ? best : undefined;
}
