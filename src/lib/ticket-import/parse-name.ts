export interface ParsedTicketName {
  firstName: string;
  middleName?: string;
  lastName?: string;
}

/** True when Paid by looks like a real multi-word name, not a username handle. */
export function isLikelyFullName(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.includes(" ")) return false;
  const glued = trimmed.replace(/\s+/g, "");
  if (/^[a-z]+\d+$/i.test(glued)) return false;
  if (/^[a-z]+[A-Z][a-zA-Z]*$/.test(glued)) return false;
  return true;
}

function splitNameParts(name: string): string[] {
  return name.trim().split(/\s+/).filter(Boolean);
}

/** Build canonical name from First + Last, optionally upgraded by Paid by (name). */
export function parseTicketName(
  firstName: string,
  lastName: string,
  paidByName?: string,
): ParsedTicketName {
  let name = `${firstName} ${lastName}`.trim();

  if (paidByName && isLikelyFullName(paidByName)) {
    const paidParts = splitNameParts(paidByName);
    const nameParts = splitNameParts(name);
    if (paidParts.length >= nameParts.length) {
      name = paidByName.trim();
    }
  }

  const parts = splitNameParts(name);
  if (parts.length === 0) return { firstName: "Unknown" };
  if (parts.length === 1) return { firstName: parts[0] };
  if (parts.length === 2) return { firstName: parts[0], lastName: parts[1] };
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}
