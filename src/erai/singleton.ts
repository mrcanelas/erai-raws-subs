import { EraiClient } from "./client.js";

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
      cookiePath: process.env.ERAI_COOKIE_PATH ?? ".cache/erai-cookies.json",
    }).then(async (client) => {
      await client.init();
      return client;
    });
  }

  return clientPromise;
}
