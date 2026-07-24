import assert from "node:assert/strict";
import test from "node:test";
import {
  runCrawlerSchedule,
  schedulerConfigFromEnv,
} from "./scheduler.js";
import type { CrawlStats } from "./types.js";

const EMPTY_STATS: CrawlStats = {
  directories: 0,
  anime: 0,
  files: 0,
  created: 0,
  updated: 0,
  errors: 0,
};

test("schedulerConfigFromEnv applies safe defaults", () => {
  const config = schedulerConfigFromEnv({}, new Date("2026-07-24"));

  assert.deepEqual(config, {
    rootDirectory: "Sub/2026",
    intervalMs: 360 * 60_000,
    delayMs: 400,
    runImmediately: true,
  });
});

test("schedulerConfigFromEnv parses overrides", () => {
  const config = schedulerConfigFromEnv({
    CRAWL_ROOT_DIRECTORY: "Sub/2025/Winter/",
    CRAWL_INTERVAL_MINUTES: "30",
    CRAWL_DELAY_MS: "750",
    CRAWL_RUN_ON_START: "false",
  });

  assert.deepEqual(config, {
    rootDirectory: "Sub/2025/Winter",
    intervalMs: 30 * 60_000,
    delayMs: 750,
    runImmediately: false,
  });
});

test("scheduler rejects invalid interval and root", () => {
  assert.throws(
    () => schedulerConfigFromEnv({ CRAWL_INTERVAL_MINUTES: "0" }),
    /greater than zero/,
  );
  assert.throws(
    () => schedulerConfigFromEnv({ CRAWL_ROOT_DIRECTORY: "Other/2026" }),
    /must start with Sub/,
  );
});

test("scheduler never overlaps crawls", async () => {
  const controller = new AbortController();
  let active = 0;
  let maximumActive = 0;
  let calls = 0;

  await runCrawlerSchedule(
    {
      rootDirectory: "Sub/2026",
      intervalMs: 1,
      delayMs: 0,
      runImmediately: true,
    },
    async () => {
      calls += 1;
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      if (calls === 2) {
        controller.abort();
      }
      return EMPTY_STATS;
    },
    controller.signal,
  );

  assert.equal(calls, 2);
  assert.equal(maximumActive, 1);
});

test("isCrawlerEnabledInProcess defaults to true", async () => {
  const { isCrawlerEnabledInProcess } = await import("./start.js");
  assert.equal(isCrawlerEnabledInProcess({}), true);
  assert.equal(isCrawlerEnabledInProcess({ CRAWL_ENABLED: "false" }), false);
});
