import "dotenv/config";
import { prisma } from "../db/client.js";
import { getEraiClient } from "../erai/singleton.js";
import { logger } from "../utils/logger.js";
import { EraiCrawler } from "./indexer.js";
import {
  runCrawlerSchedule,
  schedulerConfigFromEnv,
} from "./scheduler.js";

const abortController = new AbortController();

function stop(signal: NodeJS.Signals): void {
  logger.info("crawler worker stopping", { signal });
  abortController.abort();
}

process.once("SIGINT", () => stop("SIGINT"));
process.once("SIGTERM", () => stop("SIGTERM"));

async function main(): Promise<void> {
  const config = schedulerConfigFromEnv();
  const client = await getEraiClient();

  await runCrawlerSchedule(
    config,
    async (rootDirectory, delayMs) => {
      // Crawler traversal state is per run, so each sync gets a fresh instance.
      const crawler = new EraiCrawler(client, prisma);
      return crawler.crawl({ rootDirectory, delayMs });
    },
    abortController.signal,
  );
}

main()
  .catch((error: unknown) => {
    logger.error("crawler worker failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
