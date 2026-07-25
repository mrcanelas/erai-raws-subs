import { EraiClient } from "./client.js";

/** Session id for the env-backed crawler / single-tenant client. */
export const ENV_SESSION_ID = "env";

let clientPromise: Promise<EraiClient> | null = null;

export function getEraiClient(): Promise<EraiClient> {
  if (!clientPromise) {
    const username = process.env.ERAI_USERNAME;
    const password = process.env.ERAI_PASSWORD;

    if (!username || !password) {
      return Promise.reject(
        new Error("ERAI_USERNAME and ERAI_PASSWORD must be set"),
      );
    }

    clientPromise = EraiClient.create({
      baseUrl: process.env.ERAI_BASE_URL,
      credentials: { username, password },
      sessionId: ENV_SESSION_ID,
    }).then(async (client) => {
      await client.init();
      return client;
    });
  }

  return clientPromise;
}
