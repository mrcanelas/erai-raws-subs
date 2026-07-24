import type { Request, Response } from "express";
import { promises as fs } from "node:fs";
import { prisma } from "../db/client.js";
import type { EraiClient } from "../erai/client.js";
import { logger } from "../utils/logger.js";
import { ensureSubtitleCached } from "./cache.js";

export function createSubtitleProxyHandler(getClient: () => Promise<EraiClient>) {
  return async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId)?.replace(
      /\.(ass|ssa)$/i,
      "",
    );
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

      // Serve raw bytes so libass-wasm / ASS detection can sniff content.
      const body = await fs.readFile(absolutePath);

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      // MIME types recognized by stremio-video subtitleTypes.isASSFormat
      res.setHeader("Content-Type", "text/x-ass; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${subtitle.fileName.replace(/"/g, "")}"`,
      );
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Content-Length", String(body.byteLength));

      res.status(200).end(body);
    } catch (error) {
      logger.error("subtitle proxy failed", {
        subtitleId: id,
        error: error instanceof Error ? error.message : String(error),
      });
      if (!res.headersSent) {
        res.status(502).json({ error: "Failed to fetch subtitle" });
      }
    }
  };
}
