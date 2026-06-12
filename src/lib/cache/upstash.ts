type UpstashResult<T> = { result: T };

async function upstashCommand<T>(command: (string | number)[]): Promise<T | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(command),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as UpstashResult<T>;
    return data.result ?? null;
  } catch {
    return null;
  }
}

export async function upstashGet(key: string): Promise<string | null> {
  const result = await upstashCommand<string | null>(["GET", key]);
  if (result === null || result === undefined) return null;
  return typeof result === "string" ? result : JSON.stringify(result);
}

export async function upstashSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  await upstashCommand(["SET", key, value, "EX", ttlSeconds]);
}

export async function upstashDel(key: string): Promise<void> {
  await upstashCommand(["DEL", key]);
}

export async function upstashDelMany(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await upstashCommand(["DEL", ...keys]);
}

export async function upstashKeys(pattern: string): Promise<string[]> {
  const result = await upstashCommand<string[]>(["KEYS", pattern]);
  return Array.isArray(result) ? result : [];
}

export async function upstashIncr(key: string, ttlSeconds: number): Promise<number | null> {
  const count = await upstashCommand<number>(["INCR", key]);
  if (count === null) return null;
  if (count === 1) await upstashCommand(["EXPIRE", key, ttlSeconds]);
  return count;
}
