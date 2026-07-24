import { logger } from "../utils/logger.js";
import type { EraiClient } from "./client.js";
import { EraiHttpError } from "./types.js";

export type DownloadResult = {
  buffer: Buffer;
  contentType: string | undefined;
  url: string;
  bytes: number;
};

/**
 * Downloads a subtitle file (typically .ass) through the authenticated client.
 * Does not mirror the entire Erai repository — on-demand only.
 */
export async function downloadSubtitle(
  client: EraiClient,
  downloadUrl: string,
): Promise<DownloadResult> {
  logger.info("subtitle download starting", { downloadUrl });

  const buffer = await client.getBuffer(downloadUrl);

  if (buffer.byteLength === 0) {
    throw new EraiHttpError(204, downloadUrl, "Empty subtitle payload");
  }

  // Heuristic: HTML error pages should not be treated as ASS/SRT.
  const head = buffer.subarray(0, Math.min(buffer.byteLength, 256)).toString("utf8");
  if (/<!DOCTYPE html|<html[\s>]/i.test(head)) {
    throw new EraiHttpError(
      403,
      downloadUrl,
      "Download returned HTML instead of a subtitle file",
    );
  }

  logger.info("subtitle download complete", {
    downloadUrl,
    bytes: buffer.byteLength,
  });

  return {
    buffer,
    contentType: undefined,
    url: downloadUrl,
    bytes: buffer.byteLength,
  };
}
