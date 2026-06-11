export function formatAgendaTime(iso: string, hour12 = true) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12,
  });
}

export function formatAgendaTime24(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatAgendaTimeRange(start: string, end: string, hour12 = true) {
  return `${formatAgendaTime(start, hour12)} – ${formatAgendaTime(end, hour12)}`;
}

export function formatEventDay(dateIso: string) {
  return new Date(dateIso).toLocaleDateString(undefined, { weekday: "long" }).toUpperCase();
}

export function formatEventDateDots(dateIso: string) {
  const date = new Date(dateIso);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export function eventTimeSpan(items: { startTime: string; endTime: string }[]) {
  if (items.length === 0) return "";
  const sorted = [...items].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
  return formatAgendaTimeRange(sorted[0].startTime, sorted[sorted.length - 1].endTime);
}
