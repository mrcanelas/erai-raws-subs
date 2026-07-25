/**
 * Preference-aware subtitle selection. Keeps matching in one place so
 * configure-page codes (fre/ger/chi) and crawler ISO codes (fra/deu/zho)
 * resolve to the same tracks.
 */

const LANGUAGE_ALIASES: Record<string, string> = {
  por: "por",
  pt: "por",
  pob: "por",
  eng: "eng",
  en: "eng",
  spa: "spa",
  es: "spa",
  fre: "fre",
  fra: "fre",
  fr: "fre",
  ita: "ita",
  it: "ita",
  ger: "ger",
  deu: "ger",
  de: "ger",
  jpn: "jpn",
  ja: "jpn",
  chi: "chi",
  zho: "chi",
  zh: "chi",
  dut: "dut",
  nld: "dut",
  nl: "dut",
  kor: "kor",
  ko: "kor",
  rus: "rus",
  ru: "rus",
  ara: "ara",
  ar: "ara",
};

export function canonicalizeLanguage(code: string | undefined): string | undefined {
  if (!code) {
    return undefined;
  }
  const normalized = code.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return LANGUAGE_ALIASES[normalized] ?? normalized;
}

export function languagesMatch(a: string, b: string): boolean {
  const left = canonicalizeLanguage(a);
  const right = canonicalizeLanguage(b);
  return Boolean(left && right && left === right);
}

export type PreferenceFilter = {
  preferredLanguage?: string;
  preferredOnly?: boolean;
};

export function applyLanguagePreferences<T extends { lang: string }>(
  subtitles: T[],
  prefs: PreferenceFilter | undefined,
): T[] {
  if (!prefs?.preferredLanguage) {
    return subtitles;
  }

  const preferred = canonicalizeLanguage(prefs.preferredLanguage);
  if (!preferred) {
    return subtitles;
  }

  const matching = subtitles.filter((row) =>
    languagesMatch(row.lang, preferred),
  );

  if (prefs.preferredOnly) {
    return matching;
  }

  if (matching.length === 0) {
    return subtitles;
  }

  // Preferred tracks first, keep relative order within each group.
  const others = subtitles.filter(
    (row) => !languagesMatch(row.lang, preferred),
  );
  return [...matching, ...others];
}
