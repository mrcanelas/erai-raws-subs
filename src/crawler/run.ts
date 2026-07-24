import "dotenv/config";
import { prisma } from "../db/client.js";
import { EraiClient } from "../erai/client.js";
import { logger } from "../utils/logger.js";
import { EraiCrawler } from "./indexer.js";

const SEASONS = new Map(
  ["winter", "spring", "summer", "fall"].map((season) => [
    season,
    season[0].toUpperCase() + season.slice(1),
  ]),
);

type CliOptions = {
  year: number;
  season?: string;
  anime?: string;
  delayMs: number;
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
    year: new Date().getFullYear(),
    delayMs: 400,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--year") {
      options.year = Number(valueAfter(args, index, arg));
      index += 1;
    } else if (arg === "--season") {
      const raw = valueAfter(args, index, arg).toLowerCase();
      options.season = SEASONS.get(raw);
      if (!options.season) {
        throw new Error("--season must be Winter, Spring, Summer, or Fall");
      }
      index += 1;
    } else if (arg === "--anime") {
      options.anime = valueAfter(args, index, arg).trim();
      index += 1;
    } else if (arg === "--delay") {
      options.delayMs = Number(valueAfter(args, index, arg));
      index += 1;
    } else if (arg === "--help") {
      console.log(
        "Usage: npm run crawl -- [--year 2025] [--season Winter] [--anime Medalist] [--delay 400]",
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(options.year) || options.year < 1970 || options.year > 2100) {
    throw new Error("--year must be an integer between 1970 and 2100");
  }
  if (!Number.isFinite(options.delayMs) || options.delayMs < 0) {
    throw new Error("--delay must be a non-negative number");
  }
  if (options.anime && !options.season) {
    throw new Error("--anime requires --season");
  }

  return options;
}

export function rootDirectory(options: CliOptions): string {
  return ["Sub", String(options.year), options.season, options.anime]
    .filter((part): part is string => Boolean(part))
    .join("/");
}

async function main(): Promise<void> {
  const username = process.env.ERAI_USERNAME;
  const password = process.env.ERAI_PASSWORD;
  if (!username || !password) {
    throw new Error("ERAI_USERNAME and ERAI_PASSWORD must be set in .env");
  }

  const options = parseCliOptions(process.argv.slice(2));
  const client = await EraiClient.create({
    baseUrl: process.env.ERAI_BASE_URL,
    credentials: { username, password },
    cookiePath: process.env.ERAI_COOKIE_PATH ?? ".cache/erai-cookies.json",
  });

  const crawler = new EraiCrawler(client, prisma);
  const stats = await crawler.crawl({
    rootDirectory: rootDirectory(options),
    delayMs: options.delayMs,
  });

  if (stats.errors > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    logger.error("crawler command failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
