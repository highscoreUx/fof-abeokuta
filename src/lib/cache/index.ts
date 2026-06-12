import {
  upstashDel,
  upstashDelMany,
  upstashGet,
  upstashIncr,
  upstashKeys,
  upstashSet,
} from "@/lib/cache/upstash";

const KEY_PREFIX = "fof:";

type MemoryEntry = { value: string; expiresAt: number };

const memory = new Map<string, MemoryEntry>();

function hasUpstash(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function prefixed(key: string) {
  return `${KEY_PREFIX}${key}`;
}

function readMemory(key: string): string | null {
  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memory.delete(key);
    return null;
  }
  return entry.value;
}

function writeMemory(key: string, value: string, ttlSeconds: number) {
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function deleteMemory(key: string) {
  memory.delete(key);
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const fullKey = prefixed(key);

  const local = readMemory(fullKey);
  if (local !== null) {
    try {
      return JSON.parse(local) as T;
    } catch {
      return null;
    }
  }

  if (!hasUpstash()) return null;

  const raw = await upstashGet(fullKey);
  if (raw === null) return null;

  try {
    const parsed = JSON.parse(raw) as T;
    writeMemory(fullKey, raw, 60);
    return parsed;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const fullKey = prefixed(key);
  const serialized = JSON.stringify(value);
  writeMemory(fullKey, serialized, ttlSeconds);

  if (hasUpstash()) {
    await upstashSet(fullKey, serialized, ttlSeconds);
  }
}

export async function cacheGetOrSet<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const value = await loader();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

export async function cacheDelete(key: string): Promise<void> {
  const fullKey = prefixed(key);
  deleteMemory(fullKey);

  if (hasUpstash()) {
    await upstashDel(fullKey);
  }
}

export async function cacheDeletePattern(prefix: string): Promise<void> {
  const fullPrefix = prefixed(prefix);

  for (const key of [...memory.keys()]) {
    if (key.startsWith(fullPrefix)) memory.delete(key);
  }

  if (hasUpstash()) {
    const keys = await upstashKeys(`${fullPrefix}*`);
    if (keys.length > 0) await upstashDelMany(keys);
  }
}

/** Sliding-window rate limit. Returns true if allowed. */
export async function rateLimitAllow(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const fullKey = prefixed(`rl:${key}`);

  if (hasUpstash()) {
    const count = await upstashIncr(fullKey, windowSeconds);
    if (count !== null) return count <= limit;
  }

  const now = Date.now();
  const memKey = fullKey;
  const entry = memory.get(memKey);
  if (!entry || now > entry.expiresAt) {
    writeMemory(memKey, "1", windowSeconds);
    return true;
  }

  const count = parseInt(entry.value, 10) + 1;
  writeMemory(memKey, String(count), Math.ceil((entry.expiresAt - now) / 1000));
  return count <= limit;
}

export const CACHE_TTL = {
  event: 120,
  activities: 120,
  session: 60,
  settings: 120,
  quizSnapshot: 2,
  leaderboard: 10,
} as const;
