import type { ManifestSchema } from "@stremio-addon/zod";
import { publicBaseUrl } from "../utils/url.js";

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

export const manifest: ManifestSchema = {
  id: "com.erai-raws.subs",
  version: "0.1.0",
  name: "Erai-Raws Subs",
  logo: `${publicBaseUrl()}/logo.png`,
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
