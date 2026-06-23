import { hashPassword } from "@/lib/auth/bcrypt";
import { generateStrongPassword } from "@/lib/auth/password";
import { getProfilePermissions } from "@/lib/role-preset-cache";
import { prisma } from "@/lib/prisma";
import { userWithAccountInclude } from "@/lib/user-display";
import { computeRegistrationFingerprint } from "@/lib/ticket-import/fingerprint";
import {
  FIGMA_TICKET_IMPORT_SOURCE,
  type TicketCsvRow,
  toParsedIdentity,
} from "@/lib/ticket-import/parse-row";
import { generateUniqueUsername } from "@/lib/ticket-import/username";
import { ensurePlatformRolesSeeded } from "@/lib/platform-roles.server";

export type TicketImportRowResult =
  | { status: "created"; userId: string; name: string }
  | { status: "updated"; userId: string; name: string }
  | { status: "skipped"; userId: string; name: string; reason: string };

export interface TicketImportSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
  skippedRows: Array<{ row: number; reason: string }>;
  results: TicketImportRowResult[];
}

async function findAccountByFingerprint(fingerprint: string) {
  return prisma.account.findUnique({ where: { registrationFingerprint: fingerprint } });
}

async function createTicketAccount(data: {
  firstName: string;
  lastName: string;
  middleName?: string;
  maskedEmail: string;
  fingerprint: string;
}) {
  await ensurePlatformRolesSeeded();
  const permissions = getProfilePermissions("participant");
  const username = await generateUniqueUsername(data.firstName, data.lastName || undefined);
  const password = generateStrongPassword();
  const passwordHash = await hashPassword(password);

  const account = await prisma.account.create({
    data: {
      email: null,
      username,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName || "",
      middleName: data.middleName?.trim() || null,
      registrationFingerprint: data.fingerprint,
      maskedEmail: data.maskedEmail,
      importSource: FIGMA_TICKET_IMPORT_SOURCE,
      mustChangePassword: true,
      permissions,
    },
  });

  return { account, initialPassword: password };
}

export async function importTicketRow(
  eventId: string,
  row: TicketCsvRow,
): Promise<TicketImportRowResult> {
  const identity = toParsedIdentity(row);
  const fingerprint = computeRegistrationFingerprint({
    firstName: identity.firstName,
    middleName: identity.middleName,
    lastName: identity.lastName,
    maskedEmail: row.maskedEmail,
  });

  const displayName = [identity.firstName, identity.middleName, identity.lastName]
    .filter(Boolean)
    .join(" ");

  const existingByTicket = await prisma.user.findFirst({
    where: { eventId, ticketNumber: row.ticketNumber },
    include: userWithAccountInclude,
  });

  if (existingByTicket) {
    await prisma.user.update({
      where: { id: existingByTicket.id },
      data: {
        orderNumber: row.orderNumber || existingByTicket.orderNumber,
      },
    });

    await prisma.account.update({
      where: { id: existingByTicket.accountId },
      data: {
        firstName: identity.firstName,
        lastName: identity.lastName || "",
        middleName: identity.middleName?.trim() || null,
        maskedEmail: row.maskedEmail || existingByTicket.account.maskedEmail,
        registrationFingerprint:
          existingByTicket.account.registrationFingerprint ?? fingerprint,
      },
    });

    return {
      status: "updated",
      userId: existingByTicket.id,
      name: displayName,
    };
  }

  let account = await findAccountByFingerprint(fingerprint);

  if (!account) {
    const created = await createTicketAccount({
      firstName: identity.firstName,
      lastName: identity.lastName || "",
      middleName: identity.middleName,
      maskedEmail: row.maskedEmail,
      fingerprint,
    });
    account = created.account;
  } else {
    await prisma.account.update({
      where: { id: account.id },
      data: {
        firstName: identity.firstName,
        lastName: identity.lastName || account.lastName,
        middleName: identity.middleName?.trim() || account.middleName,
        maskedEmail: row.maskedEmail || account.maskedEmail,
      },
    });
  }

  const existingMembership = await prisma.user.findUnique({
    where: { accountId_eventId: { accountId: account.id, eventId } },
  });

  if (existingMembership) {
    return {
      status: "skipped",
      userId: existingMembership.id,
      name: displayName,
      reason: "Already registered for this event (different ticket number)",
    };
  }

  const user = await prisma.user.create({
    data: {
      accountId: account.id,
      eventId,
      ticketNumber: row.ticketNumber,
      orderNumber: row.orderNumber || null,
    },
  });

  return {
    status: "created",
    userId: user.id,
    name: displayName,
  };
}

export async function importTicketRows(
  eventId: string,
  rows: TicketCsvRow[],
  rowNumbers: number[],
  skippedRows: Array<{ row: number; reason: string }> = [],
): Promise<TicketImportSummary> {
  const summary: TicketImportSummary = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    skippedRows: [...skippedRows],
    results: [],
  };

  for (let i = 0; i < rows.length; i++) {
    try {
      const result = await importTicketRow(eventId, rows[i]);
      summary.results.push(result);
      if (result.status === "created") summary.created += 1;
      else if (result.status === "updated") summary.updated += 1;
      else summary.skipped += 1;
    } catch (error) {
      summary.errors.push({
        row: rowNumbers[i],
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return summary;
}
