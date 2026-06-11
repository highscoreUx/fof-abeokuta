/** Client-safe slug helper for access profile names (no database imports). */
export function slugifyEventUserRoleName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 50) || "role"
  );
}
