import { createHash } from "crypto";

function normalizeNamePart(part: string): string {
  return part
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "");
}

export function maskedEmailSignals(maskedEmail: string): { length: number; firstLetter: string } {
  const trimmed = maskedEmail.trim();
  const atIndex = trimmed.indexOf("@");
  const localPart = atIndex >= 0 ? trimmed.slice(0, atIndex) : trimmed;
  return {
    length: trimmed.length,
    firstLetter: localPart.charAt(0).toLowerCase(),
  };
}

export function computeRegistrationFingerprint(input: {
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  maskedEmail: string;
}): string {
  const parts: string[] = [normalizeNamePart(input.firstName)];

  if (input.middleName?.trim()) {
    parts.push(normalizeNamePart(input.middleName));
  }
  if (input.lastName?.trim()) {
    parts.push(normalizeNamePart(input.lastName));
  }

  const { length, firstLetter } = maskedEmailSignals(input.maskedEmail);
  parts.push(String(length));
  parts.push(firstLetter);

  return createHash("sha256").update(parts.join("|")).digest("hex");
}
