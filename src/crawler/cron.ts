import type { Request, Response } from "express";
import { prisma } from "../db/client.js";
import { getEraiClient } from "../erai/singleton.js";
import { logger } from "../utils/logger.js";
import { EraiCrawler } from "./indexer.js";
import { schedulerConfigFromEnv } from "./scheduler.js";

function finiteNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  return Number(value);
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const header = req.headers.authorization;
  return header === `Bearer ${secret}`;
}

/**
 * One-shot crawl for Vercel Cron / manual triggers.
 * Aborts before Function maxDuration so progress is saved incrementally.
 */
export async function handleCronCrawl(
  req: Request,
  res: Response,
): Promise<void> {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  if (!isAuthorized(req)) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }

  const budgetMs = finiteNumber(process.env.CRAWL_BUDGET_MS, 240_000);
  if (!Number.isFinite(budgetMs) || budgetMs < 5_000) {
    res.status(500).json({ ok: false, error: "invalid_crawl_budget" });
    return;
  }

  const config = schedulerConfigFromEnv();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budgetMs);
  const startedAt = Date.now();

  try {
    const client = await getEraiClient();
    const crawler = new EraiCrawler(client, prisma);
    const stats = await crawler.crawl({
      rootDirectory: config.rootDirectory,
      delayMs: config.delayMs,
      signal: controller.signal,
    });

    logger.info("cron crawl completed", {
      durationMs: Date.now() - startedAt,
      aborted: controller.signal.aborted,
      ...stats,
    });

    res.status(200).json({
      ok: true,
      aborted: controller.signal.aborted,
      durationMs: Date.now() - startedAt,
      ...stats,
    });
  } catch (error) {
    logger.error("cron crawl failed", {
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timer);
  }
}
