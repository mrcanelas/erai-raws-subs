import { prisma } from "../db/client.js";
import { getEraiClient } from "../erai/singleton.js";
import { logger } from "../utils/logger.js";
import { EraiCrawler } from "./indexer.js";
import {
  runCrawlerSchedule,
  schedulerConfigFromEnv,
  type SchedulerConfig,
} from "./scheduler.js";

function booleanValue(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  if (/^(?:1|true|yes)$/i.test(value)) {
    return true;
  }
  if (/^(?:0|false|no)$/i.test(value)) {
    return false;
  }
  throw new Error(`Invalid boolean value: ${value}`);
}

/** Whether the addon process should host the crawler scheduler. */
export function isCrawlerEnabledInProcess(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return booleanValue(env.CRAWL_ENABLED, true);
}

/**
 * Starts the incremental crawler in the background.
 * Returns false when CRAWL_ENABLED=false (addon-only mode).
 */
export function startBackgroundCrawler(
  options: {
    env?: NodeJS.ProcessEnv;
    signal?: AbortSignal;
    config?: SchedulerConfig;
  } = {},
): boolean {
  const env = options.env ?? process.env;
  if (!isCrawlerEnabledInProcess(env)) {
    logger.info("crawler disabled in this process", {
      hint: "set CRAWL_ENABLED=true or run npm run crawl:worker",
    });
    return false;
  }

  const signal = options.signal ?? new AbortController().signal;
  const config = options.config ?? schedulerConfigFromEnv(env);

  void (async () => {
    const client = await getEraiClient();
    await runCrawlerSchedule(
      config,
      async (rootDirectory, delayMs) => {
        const crawler = new EraiCrawler(client, prisma);
        return crawler.crawl({ rootDirectory, delayMs });
      },
      signal,
    );
  })().catch((error: unknown) => {
    logger.error("background crawler crashed", {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return true;
}
