export type MetadataIds = {
  imdb?: string;
  kitsu?: string;
  anilist?: string;
  mal?: string;
  tmdb?: string;
  tvdb?: string;
};

export type ResolvedMetadata = MetadataIds & {
  canonicalTitle?: string;
  aliases: string[];
  startDate?: Date;
  episodeCount?: number;
  source: "local" | "imdb_mapping" | "kitsu" | "anilist";
};

export type ImdbMappingEntry = {
  kitsu_id: number;
  imdb_id: string;
  title: string;
  fromSeason?: number;
  fromEpisode?: number;
};
