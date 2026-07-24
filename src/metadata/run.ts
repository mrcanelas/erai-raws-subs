import "dotenv/config";
import { prisma } from "../db/client.js";
import { logger } from "../utils/logger.js";
import { enrichAnimeMetadata } from "./enrich.js";
import { MetadataResolver } from "./resolver.js";

type CliOptions = {
  all: boolean;
  limit?: number;
  delayMs: number;
  refreshMapping: boolean;
};

function valueAfter(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

export function parseCliOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    all: false,
    delayMs: 250,
    refreshMapping: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--all") {
      options.all = true;
    } else if (arg === "--limit") {
      options.limit = Number(valueAfter(args, index, arg));
      index += 1;
    } else if (arg === "--delay") {
      options.delayMs = Number(valueAfter(args, index, arg));
      index += 1;
    } else if (arg === "--refresh-mapping") {
      options.refreshMapping = true;
    } else if (arg === "--help") {
      console.log(
        "Usage: npm run metadata:resolve -- [--all] [--limit N] [--delay 250] [--refresh-mapping]",
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (
    options.limit !== undefined &&
    (!Number.isInteger(options.limit) || options.limit < 1)
  ) {
    throw new Error("--limit must be a positive integer");
  }
  if (!Number.isFinite(options.delayMs) || options.delayMs < 0) {
    throw new Error("--delay must be a non-negative number");
  }

  return options;
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));

  if (options.refreshMapping) {
    const { loadImdbMapping } = await import("./imdb-mapping.js");
    await loadImdbMapping({ forceRefresh: true });
  }

  const resolver = new MetadataResolver();
  const stats = await enrichAnimeMetadata(prisma, resolver, {
    missingImdbOnly: !options.all,
    limit: options.limit,
    delayMs: options.delayMs,
  });

  if (stats.errors > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    logger.error("metadata resolve command failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
