const TEAM_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,23}$/;

export function normalizeTeamCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function validateTeamCode(code: string): string | null {
  if (!code) return "Team code is required";
  if (!TEAM_CODE_PATTERN.test(code)) {
    return "Use 1–24 characters: letters, numbers, hyphens, or underscores";
  }
  return null;
}
