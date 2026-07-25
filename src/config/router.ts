import { type Request, type Response, Router, urlencoded } from "express";
import { prisma } from "../db/client.js";
import { resolveEraiClient } from "../erai/resolve.js";
import { EraiAuthError } from "../erai/types.js";
import { logger } from "../utils/logger.js";
import { installLinksForToken } from "../utils/url.js";
import { ConfigSecretError, isConfigSecretConfigured } from "./crypto.js";
import {
  renderConfigurePage,
  type ConfigureFormValues,
} from "./page.js";
import { createAddonConfig } from "./store.js";

function formValues(body: Record<string, unknown> = {}): ConfigureFormValues {
  return {
    username: String(body.username ?? "").trim() || undefined,
    preferredLanguage: String(body.preferredLanguage ?? "eng").trim() || "eng",
    preferredOnly: String(body.preferredOnly ?? "1") !== "0",
  };
}

function sendPage(
  res: Response,
  options: Parameters<typeof renderConfigurePage>[0] = {},
  status = 200,
): void {
  res.status(status).type("html").send(renderConfigurePage(options));
}

async function handleSubmit(req: Request, res: Response): Promise<void> {
  const values = formValues(req.body as Record<string, unknown>);
  const password = String(req.body?.password ?? "");

  if (!values.username || !password) {
    sendPage(
      res,
      {
        error: "Enter your Erai-Raws email and password.",
        values,
      },
      400,
    );
    return;
  }

  if (!isConfigSecretConfigured()) {
    sendPage(
      res,
      {
        error:
          "CONFIG_SECRET is missing on this server. Ask the administrator to configure it.",
        values,
      },
      500,
    );
    return;
  }

  let token: string | undefined;
  try {
    token = await createAddonConfig({
      username: values.username,
      password,
      preferredLanguage: values.preferredLanguage,
      preferredOnly: values.preferredOnly,
    });
    // Warm the tenant client, which performs the actual Erai login.
    await resolveEraiClient(token);

    logger.info("configure succeeded", { token: token.slice(0, 6) });
    sendPage(res, {
      connected: true,
      values,
      links: installLinksForToken(token),
    });
  } catch (error) {
    if (token) {
      await prisma.addonConfig
        .delete({ where: { token } })
        .catch(() => undefined);
    }

    if (error instanceof ConfigSecretError) {
      sendPage(res, { error: error.message, values }, 500);
      return;
    }

    if (error instanceof EraiAuthError) {
      sendPage(
        res,
        {
          error: "Invalid email or password. Please try again.",
          values,
        },
        401,
      );
      return;
    }

    logger.error("configure failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    sendPage(
      res,
      {
        error: "Unexpected error while validating credentials.",
        values,
      },
      502,
    );
  }
}

export function createConfigRouter(): Router {
  const router = Router();

  router.get("/configure", (_req, res) => sendPage(res));
  // Stremio may open /{config}/configure for an installed addon.
  router.get("/:config/configure", (_req, res) => sendPage(res));
  router.post(
    "/configure",
    urlencoded({ extended: false }),
    (req, res) => {
      void handleSubmit(req, res);
    },
  );

  return router;
}
