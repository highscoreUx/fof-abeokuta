const NAME_COLORS = [
  "#e542a3",
  "#ce5e82",
  "#1fa855",
  "#0066cc",
  "#7d4f8c",
  "#1f95c4",
  "#e67e22",
  "#9b59b6",
  "#16a085",
  "#c0392b",
] as const;

export function userInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function nameColorForUser(username: string) {
  let hash = 0;
  for (const char of username) {
    hash = (hash + char.charCodeAt(0)) % NAME_COLORS.length;
  }
  return NAME_COLORS[hash]!;
}

export function formatMessageTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const GROUP_WINDOW_MS = 2 * 60 * 1000;

export function isSameMessageGroup(
  current: { user: { username: string }; createdAt: string },
  previous?: { user: { username: string }; createdAt: string },
) {
  if (!previous) return false;
  if (previous.user.username !== current.user.username) return false;
  const delta =
    new Date(current.createdAt).getTime() - new Date(previous.createdAt).getTime();
  return delta >= 0 && delta < GROUP_WINDOW_MS;
}
