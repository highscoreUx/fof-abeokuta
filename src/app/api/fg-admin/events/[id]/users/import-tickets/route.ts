import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/auth/middleware";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { prisma } from "@/lib/prisma";
import { importTicketRows } from "@/lib/ticket-import/import-service";
import { parseTicketImportFile } from "@/lib/ticket-import/parse-file";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id: eventId } = await params;
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) return jsonError("Event not found", "NOT_FOUND", 404);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return jsonError("No file provided", "NO_FILE", 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const { rows, rowNumbers, skipped } = parseTicketImportFile(buffer, file.name);

  if (rows.length === 0) {
    return jsonError("No valid ticket rows found in file", "NO_ROWS", 400);
  }

  const summary = await importTicketRows(eventId, rows, rowNumbers, skipped);

  return NextResponse.json(summary);
}
