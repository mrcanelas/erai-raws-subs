export function publicBaseUrl(): string {
  const configured = process.env.ADDON_PUBLIC_URL?.replace(/\/+$/, "");
  if (configured) {
    return configured;
  }

  const port = Number(process.env.PORT) || 7000;
  return `http://127.0.0.1:${port}`;
}

/** Encodes an addon config object into a single URL path segment. */
export function encodeConfigSegment(config: Record<string, unknown>): string {
  return encodeURIComponent(JSON.stringify(config));
}

export type InstallLinks = {
  manifestUrl: string;
  installUrl: string;
};

/** Builds the https manifest URL and a stremio:// deep link for a token. */
export function installLinksForToken(token: string): InstallLinks {
  const base = publicBaseUrl();
  const segment = encodeConfigSegment({ t: token });
  const manifestUrl = `${base}/${segment}/manifest.json`;
  const installUrl = manifestUrl.replace(/^https?:\/\//, "stremio://");
  return { manifestUrl, installUrl };
}
