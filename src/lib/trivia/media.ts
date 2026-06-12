export function isMediaUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  );
}

export function filterValidMediaUrls(urls: string[]): string[] {
  return urls.map((u) => u.trim()).filter(isMediaUrl);
}
