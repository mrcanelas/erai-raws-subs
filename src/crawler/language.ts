const DIRECTORY_LANGUAGES: Record<string, string> = {
  english: "eng",
  portuguese: "por",
  "portuguese brazil": "por",
  "portuguese portugal": "por",
  spanish: "spa",
  "spanish latin america": "spa",
  french: "fra",
  german: "deu",
  italian: "ita",
  arabic: "ara",
  japanese: "jpn",
  russian: "rus",
  turkish: "tur",
  indonesian: "ind",
  thai: "tha",
  vietnamese: "vie",
  chinese: "zho",
  korean: "kor",
  malay: "msa",
};

const TWO_LETTER_LANGUAGES: Record<string, string> = {
  ar: "ara",
  de: "deu",
  en: "eng",
  es: "spa",
  fr: "fra",
  id: "ind",
  it: "ita",
  ja: "jpn",
  ko: "kor",
  ms: "msa",
  pt: "por",
  ru: "rus",
  th: "tha",
  tr: "tur",
  vi: "vie",
  zh: "zho",
};

function normalizeDirectoryLanguage(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[()_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function languageFromDirectories(
  pathSegments: readonly string[],
): string | undefined {
  for (const segment of [...pathSegments].reverse()) {
    const language = DIRECTORY_LANGUAGES[normalizeDirectoryLanguage(segment)];
    if (language) {
      return language;
    }
  }

  return undefined;
}

export function languageFromFilename(fileName: string): string | undefined {
  const match = fileName.match(/\.([a-z]{2,3})(?:-[a-z]{2})?\.(?:ass|ssa)$/i);
  if (!match) {
    return undefined;
  }

  const code = match[1].toLowerCase();
  return TWO_LETTER_LANGUAGES[code] ?? code;
}

export function detectLanguage(
  fileName: string,
  pathSegments: readonly string[],
): string {
  return (
    languageFromDirectories(pathSegments) ??
    languageFromFilename(fileName) ??
    "und"
  );
}
