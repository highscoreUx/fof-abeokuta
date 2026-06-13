import { getAppBaseUrl } from "@/lib/email/config";
import { loadAgendaForEmail } from "@/lib/email/agenda-for-email";
import { buildCheckInWelcomeEmail } from "@/lib/email/templates/check-in-welcome";
import type { PreparedEmail } from "@/lib/email/prepared-email";
import { prisma } from "@/lib/prisma";
import { userWithAccountInclude } from "@/lib/user-display";

export async function prepareCheckInWelcomeEmail(
  userId: string,
  eventId: string,
): Promise<PreparedEmail | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, eventId },
    include: userWithAccountInclude,
  });

  if (!user) {
    throw new Error(`User ${userId} not found for event ${eventId}`);
  }

  const email = user.account.email?.trim();
  if (!email) {
    console.info(`[email] Skipping check-in email for user ${userId}: no email on account`);
    return null;
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { slug: true },
  });
  if (!event) {
    throw new Error(`Event ${eventId} not found`);
  }

  const agenda = await loadAgendaForEmail(eventId);
  if (!agenda) {
    throw new Error(`Could not load agenda for event ${eventId}`);
  }

  const loginUrl = `${getAppBaseUrl()}/${event.slug}/login`;
  const { subject, html, text } = buildCheckInWelcomeEmail({
    firstName: user.account.firstName,
    eventSlug: event.slug,
    loginUrl,
    agenda,
    teamLetter: user.team?.letter ?? null,
  });

  return {
    to: email,
    subject,
    html,
    text,
    meta: { kind: "check_in_welcome" },
  };
}
