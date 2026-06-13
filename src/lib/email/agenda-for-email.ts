import { formatAgendaTimeRange, formatEventDateDots, formatEventDay } from "@/lib/agenda-format";
import { prisma } from "@/lib/prisma";

export interface EmailAgendaItem {
  title: string;
  description: string | null;
  timeRange: string;
}

export interface EmailAgendaPayload {
  eventTitle: string;
  eventDateLabel: string;
  eventDayLabel: string;
  items: EmailAgendaItem[];
}

export async function loadAgendaForEmail(eventId: string): Promise<EmailAgendaPayload | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { title: true, date: true },
  });
  if (!event) return null;

  const rows = await prisma.agendaItem.findMany({
    where: { eventId, visible: true },
    orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }],
    select: { title: true, description: true, startTime: true, endTime: true },
  });

  const dateIso = event.date.toISOString();

  return {
    eventTitle: event.title,
    eventDateLabel: formatEventDateDots(dateIso),
    eventDayLabel: formatEventDay(dateIso),
    items: rows.map((row) => ({
      title: row.title,
      description: row.description,
      timeRange: formatAgendaTimeRange(row.startTime.toISOString(), row.endTime.toISOString()),
    })),
  };
}
