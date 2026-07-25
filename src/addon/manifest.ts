import type { ManifestSchema } from "@stremio-addon/zod";

function hasEnvCredentials(): boolean {
  return Boolean(
    process.env.ERAI_USERNAME?.trim() && process.env.ERAI_PASSWORD?.trim(),
  );
}

export const manifest: ManifestSchema = {
  id: "com.erai-raws.subs",
  version: "0.1.0",
  name: "Erai-Raws Subs",
  logo: "https://i.imgur.com/o9ourQq.png",
  description:
    "ASS subtitles from Erai-Raws (styled karaoke, signs, fonts)",
  resources: ["subtitles"],
  types: ["series", "movie"],
  catalogs: [],
  idPrefixes: ["tt"],
  behaviorHints: {
    configurable: true,
    // Force configuration in production; dev installs with env creds stay
    // directly installable.
    configurationRequired: !hasEnvCredentials(),
  },
};
