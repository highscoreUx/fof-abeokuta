import slugify from "slugify";
import { prisma } from "@/lib/prisma";
import { normalizeUsername } from "@/lib/accounts";

function baseUsername(firstName: string, lastName?: string): string {
  const raw = [firstName, lastName].filter(Boolean).join(".");
  const slug = slugify(raw, { lower: true, strict: true, trim: true });
  if (slug.length >= 3) return slug.slice(0, 28);
  const fallback = slugify(firstName, { lower: true, strict: true, trim: true });
  return (fallback || "guest").slice(0, 28);
}

export async function generateUniqueUsername(
  firstName: string,
  lastName?: string,
): Promise<string> {
  const base = baseUsername(firstName, lastName);
  let candidate = normalizeUsername(base);
  let suffix = 0;

  while (await prisma.account.findUnique({ where: { username: candidate } })) {
    suffix += 1;
    candidate = normalizeUsername(`${base.slice(0, 22)}_${suffix}`);
  }

  return candidate;
}
