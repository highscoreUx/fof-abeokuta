import { parseTicketName } from "@/lib/ticket-import/parse-name";

export const FIGMA_TICKET_IMPORT_SOURCE = "figma-ticket-export";

export interface TicketCsvRow {
  orderNumber: string;
  ticketNumber: string;
  firstName: string;
  lastName: string;
  maskedEmail: string;
  paidByName?: string;
}

function pickColumn(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const direct = row[key];
    if (direct !== undefined && direct !== "") return String(direct).trim();
  }

  const normalized = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v]),
  );

  for (const key of keys) {
    const value = normalized[key.trim().toLowerCase()];
    if (value !== undefined && value !== "") return String(value).trim();
  }

  return "";
}

export function parseTicketCsvRow(row: Record<string, string>): TicketCsvRow | null {
  const firstName = pickColumn(row, "First Name", "firstName", "first_name");
  const lastName = pickColumn(row, "Last Name", "lastName", "last_name");
  const ticketNumber = pickColumn(row, "Ticket number", "ticketNumber", "ticket_number");
  const orderNumber = pickColumn(row, "Order number", "orderNumber", "order_number");
  const maskedEmail = pickColumn(row, "Email", "email");
  const paidByName = pickColumn(row, "Paid by (name)", "Paid by", "paidByName", "paid_by_name");

  if (!firstName && !lastName) return null;
  if (!ticketNumber) return null;

  return {
    orderNumber,
    ticketNumber,
    firstName,
    lastName,
    maskedEmail,
    paidByName: paidByName || undefined,
  };
}

export function toParsedIdentity(row: TicketCsvRow) {
  return parseTicketName(row.firstName, row.lastName, row.paidByName);
}
