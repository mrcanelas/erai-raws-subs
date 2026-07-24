import "dotenv/config";
import { AddonBuilder } from "@stremio-addon/zod";
import { getRouter } from "@stremio-addon/node-express";
import cors from "cors";
import express from "express";
import { manifest } from "./addon/manifest.js";
import { handleSubtitlesRequest } from "./addon/subtitles.js";
import { getEraiClient } from "./erai/singleton.js";
import { createSubtitleProxyHandler } from "./subtitle/serve.js";
import { logger } from "./utils/logger.js";

const builder = new AddonBuilder(manifest);

builder.defineSubtitlesHandler(async (args) => {
  return handleSubtitlesRequest(args);
});

const addonInterface = builder.getInterface();

const app = express();
const port = Number(process.env.PORT) || 7000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "HEAD", "OPTIONS"],
  }),
);

app.get(
  "/subtitle/:id",
  createSubtitleProxyHandler(() => getEraiClient()),
);

app.use("/", getRouter(addonInterface));
app.get("/", (_req, res) => {
  res.redirect("/manifest.json");
});

app.listen(port, () => {
  logger.info("addon listening", {
    port,
    manifest: `http://127.0.0.1:${port}/manifest.json`,
  });
});
