import type { ManifestSchema } from "@stremio-addon/zod";

export const manifest: ManifestSchema = {
  id: "com.erai-raws.subs",
  version: "0.1.0",
  name: "Erai-Raws Subs",
  description:
    "ASS subtitles from Erai-Raws (styled karaoke, signs, fonts)",
  resources: ["subtitles"],
  types: ["series", "movie"],
  catalogs: [],
  idPrefixes: ["tt"],
};
