import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({
    connectionString,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 300_000,
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

const TRANSIENT_ERROR_CODES = ["P1001", "P1002", "P1008", "P1017", "P2024"];

export async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delayMs = 500,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code: string }).code)
          : "";

      if (!TRANSIENT_ERROR_CODES.includes(code) || attempt === retries - 1) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }

  throw lastError;
}

export async function checkDatabaseHealth(): Promise<{
  ok: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await withRetry(() => prisma.$queryRaw`SELECT 1`);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}
