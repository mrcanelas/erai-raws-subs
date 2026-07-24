import type { Request, Response } from "express";
import { createReadStream } from "node:fs";
import { prisma } from "../db/client.js";
import type { EraiClient } from "../erai/client.js";
import { logger } from "../utils/logger.js";
import { ensureSubtitleCached } from "./cache.js";

export function createSubtitleProxyHandler(getClient: () => Promise<EraiClient>) {
  return async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      res.status(400).json({ error: "Missing subtitle id" });
      return;
    }

    const subtitle = await prisma.subtitle.findUnique({ where: { id } });
    if (!subtitle) {
      res.status(404).json({ error: "Subtitle not found" });
      return;
    }

    try {
      const client = await getClient();
      const { absolutePath, fromCache } = await ensureSubtitleCached(
        client,
        subtitle,
      );

      logger.info("serving subtitle", {
        subtitleId: id,
        fromCache,
        language: subtitle.language,
      });

      res.setHeader("Content-Type", "text/x-ass; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${subtitle.fileName.replace(/"/g, "")}"`,
      );
      res.setHeader("Cache-Control", "public, max-age=86400");

      createReadStream(absolutePath).pipe(res);
    } catch (error) {
      logger.error("subtitle proxy failed", {
        subtitleId: id,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(502).json({ error: "Failed to fetch subtitle" });
    }
  };
}
