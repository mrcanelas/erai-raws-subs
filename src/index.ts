import "dotenv/config";
import { AddonBuilder } from "@stremio-addon/zod";
import { getRouter } from "@stremio-addon/node-express";
import cors from "cors";
import express from "express";
import { manifest } from "./addon/manifest.js";
import { handleSubtitlesRequest } from "./addon/subtitles.js";
import { createConfigRouter } from "./config/router.js";
import { startBackgroundCrawler } from "./crawler/start.js";
import { resolveEraiClient } from "./erai/resolve.js";
import { createSubtitleProxyHandler } from "./subtitle/serve.js";
import { logger } from "./utils/logger.js";

const builder = new AddonBuilder(manifest);

builder.defineSubtitlesHandler(async (args) => {
  return handleSubtitlesRequest(args);
});

const addonInterface = builder.getInterface();

const app = express();
const port = Number(process.env.PORT) || 7000;
const crawlerAbort = new AbortController();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "HEAD", "OPTIONS"],
  }),
);

app.use(createConfigRouter());

const subtitleProxy = createSubtitleProxyHandler((token) =>
  resolveEraiClient(token),
);
// Tenant-scoped and env-fallback (dev) subtitle proxy routes.
app.get("/subtitle/:token/:id", subtitleProxy);
app.get("/subtitle/:id", subtitleProxy);

app.use("/", getRouter(addonInterface));
app.get("/", (_req, res) => {
  res.redirect("/manifest.json");
});

app.listen(port, () => {
  logger.info("addon listening", {
    port,
    manifest: `http://127.0.0.1:${port}/manifest.json`,
  });

  // Crawl never runs inside subtitle request handlers — only as a
  // background loop in this process (or via npm run crawl:worker).
  startBackgroundCrawler({ signal: crawlerAbort.signal });
});

function stop(signal: NodeJS.Signals): void {
  logger.info("addon shutting down", { signal });
  crawlerAbort.abort();
}

process.once("SIGINT", () => stop("SIGINT"));
process.once("SIGTERM", () => stop("SIGTERM"));
