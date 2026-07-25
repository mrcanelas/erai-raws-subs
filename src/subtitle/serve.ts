import type { Request, Response } from "express";
import { promises as fs } from "node:fs";
import { prisma } from "../db/client.js";
import type { EraiClient } from "../erai/client.js";
import { UnknownConfigTokenError } from "../erai/resolve.js";
import { logger } from "../utils/logger.js";
import { ensureSubtitleCached } from "./cache.js";

export type EraiClientResolver = (token?: string) => Promise<EraiClient>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function createSubtitleProxyHandler(resolveClient: EraiClientResolver) {
  return async (req: Request, res: Response): Promise<void> => {
    const id = firstParam(req.params.id)?.replace(/\.(ass|ssa)$/i, "");
    const token = firstParam(req.params.token);

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
      const client = await resolveClient(token);
      const { absolutePath, fromCache } = await ensureSubtitleCached(
        client,
        subtitle,
      );

      logger.info("serving subtitle", {
        subtitleId: id,
        fromCache,
        language: subtitle.language,
        configured: Boolean(token),
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
      if (error instanceof UnknownConfigTokenError) {
        logger.warn("subtitle proxy rejected unknown token", { subtitleId: id });
        res.status(401).json({ error: "Invalid addon configuration" });
        return;
      }

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
