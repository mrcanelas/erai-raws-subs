export type DirectoryEntry =
  | {
      kind: "directory";
      name: string;
      directory: string;
    }
  | {
      kind: "file";
      name: string;
      href: string;
      size?: string;
      modifiedAt?: string;
    };

export type EpisodeInfo = {
  episode: number | null;
  descriptor?: string;
};

export type CrawlOptions = {
  rootDirectory: string;
  delayMs: number;
};

export type CrawlStats = {
  directories: number;
  anime: number;
  files: number;
  created: number;
  updated: number;
  errors: number;
};
