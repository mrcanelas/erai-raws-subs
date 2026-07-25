import type { ManifestSchema } from "@stremio-addon/zod";
import { publicBaseUrl } from "../utils/url.js";

/** Absolute logo that always validates (Beamup boots before ADDON_PUBLIC_URL). */
const FALLBACK_LOGO =
  "https://raw.githubusercontent.com/mrcanelas/erai-raws-subs/master/public/logo.png";

function hasEnvCredentials(): boolean {
  return Boolean(
    process.env.ERAI_USERNAME?.trim() && process.env.ERAI_PASSWORD?.trim(),
  );
}

function configurationRequired(): boolean {
  const forced = process.env.CONFIGURATION_REQUIRED?.trim().toLowerCase();
  if (forced === "1" || forced === "true" || forced === "yes") {
    return true;
  }
  if (forced === "0" || forced === "false" || forced === "no") {
    return false;
  }
  // Dev convenience: env-backed single-tenant installs can skip /configure.
  return !hasEnvCredentials();
}

/**
 * Stremio SDK rejects loopback hosts in `logo`. Prefer ADDON_PUBLIC_URL when
 * it is a public http(s) URL; otherwise fall back to a stable absolute URL.
 */
function manifestLogo(): string {
  try {
    const url = new URL(`${publicBaseUrl()}/logo.png`);
    const host = url.hostname.toLowerCase();
    if (
      (url.protocol === "http:" || url.protocol === "https:") &&
      host !== "localhost" &&
      host !== "127.0.0.1" &&
      host !== "::1" &&
      host.includes(".")
    ) {
      return url.href;
    }
  } catch {
    // fall through to default
  }
  return FALLBACK_LOGO;
}

export const manifest: ManifestSchema = {
  id: "com.erai-raws.subs",
  version: "0.1.0",
  name: "Erai-Raws Subs",
  logo: manifestLogo(),
  description:
    "ASS subtitles from Erai-Raws (styled karaoke, signs, fonts)",
  resources: ["subtitles"],
  types: ["series", "movie"],
  catalogs: [],
  idPrefixes: ["tt"],
  behaviorHints: {
    configurable: true,
    configurationRequired: configurationRequired(),
  },
};

