import { logger } from "../utils/logger.js";
import type { CrawlStats } from "./types.js";

const MINUTE_MS = 60_000;

export type SchedulerConfig = {
  rootDirectory: string;
  intervalMs: number;
  delayMs: number;
  runImmediately: boolean;
};

export type ScheduledCrawl = (
  rootDirectory: string,
  delayMs: number,
) => Promise<CrawlStats>;

function finiteNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  return Number(value);
}

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

export function schedulerConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  now: Date = new Date(),
): SchedulerConfig {
  const intervalMinutes = finiteNumber(env.CRAWL_INTERVAL_MINUTES, 360);
  const delayMs = finiteNumber(env.CRAWL_DELAY_MS, 400);
  const rootDirectory =
    env.CRAWL_ROOT_DIRECTORY?.trim() || `Sub/${now.getFullYear()}`;

  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
    throw new Error("CRAWL_INTERVAL_MINUTES must be greater than zero");
  }
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new Error("CRAWL_DELAY_MS must be a non-negative number");
  }
  if (!rootDirectory.startsWith("Sub")) {
    throw new Error("CRAWL_ROOT_DIRECTORY must start with Sub");
  }

  return {
    rootDirectory: rootDirectory.replace(/\/+$/, ""),
    intervalMs: intervalMinutes * MINUTE_MS,
    delayMs,
    runImmediately: booleanValue(env.CRAWL_RUN_ON_START, true),
  };
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);

    function done(): void {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    }

    signal.addEventListener("abort", done, { once: true });
  });
}

/**
 * Runs crawls sequentially. The interval starts after each crawl finishes,
 * preventing overlap when a synchronization takes longer than expected.
 */
export async function runCrawlerSchedule(
  config: SchedulerConfig,
  crawl: ScheduledCrawl,
  signal: AbortSignal,
): Promise<void> {
  logger.info("crawler scheduler started", {
    rootDirectory: config.rootDirectory,
    intervalMs: config.intervalMs,
    delayMs: config.delayMs,
    runImmediately: config.runImmediately,
  });

  let shouldRun = config.runImmediately;

  while (!signal.aborted) {
    if (!shouldRun) {
      await wait(config.intervalMs, signal);
      if (signal.aborted) {
        break;
      }
    }

    shouldRun = false;
    const startedAt = Date.now();

    try {
      const stats = await crawl(config.rootDirectory, config.delayMs);
      logger.info("scheduled crawl completed", {
        durationMs: Date.now() - startedAt,
        ...stats,
      });
    } catch (error) {
      logger.error("scheduled crawl failed", {
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info("crawler scheduler stopped");
}
