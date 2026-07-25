import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function createClient(): PrismaClient {
  if (!isDatabaseConfigured()) {
    throw new Error(
      "DATABASE_URL is not set. Configure it with: beamup secrets DATABASE_URL \"postgresql://...\"",
    );
  }

  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

/**
 * Lazy Prisma proxy so the HTTP server can bind on Beamup before secrets exist.
 * First real DB access creates the client (and fails clearly if URL is missing).
 */
function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createClient();
  }
  return globalForPrisma.prisma;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getClient();
    const value = Reflect.get(client, property, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
