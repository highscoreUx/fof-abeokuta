import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { userImportRowSchema } from "@/lib/validators/auth";
import { assignTeams, assignableTeamRoleSlugs, getTeamAssignSettings } from "@/lib/team-assign";
import { createUserFromRow } from "@/lib/users";
import { jsonError } from "@/lib/auth/middleware";

function parseFile(buffer: Buffer, filename: string) {
  if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
  }
  return Papa.parse<Record<string, string>>(buffer.toString("utf-8"), {
    header: true,
    skipEmptyLines: true,
  }).data;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "user.import");
  if (ctx instanceof NextResponse) return ctx;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const autoAssignTeams = formData.get("autoAssignTeams") === "true";

  if (!file) return jsonError("No file provided", "NO_FILE", 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = parseFile(buffer, file.name);
  const created: Array<{ username: string; password: string; eventUserRoleName: string }> = [];
  const createdAssigneeIds: Array<{ id: string; eventUserRoleSlug: string }> = [];
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const parsed = userImportRowSchema.safeParse({
      firstName: row.firstName ?? row.first_name,
      lastName: row.lastName ?? row.last_name,
      middleName: row.middleName ?? row.middle_name,
      role: (row.role ?? "PARTICIPANT").toUpperCase(),
      password: row.password ?? row.PASSWORD ?? row.pin ?? row.PIN,
    });

    if (!parsed.success) {
      errors.push({ row: i + 2, error: parsed.error.message });
      continue;
    }

    try {
      const user = await createUserFromRow(ctx.event.id, {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        middleName: parsed.data.middleName,
        role: parsed.data.role,
        password: parsed.data.password ?? parsed.data.pin,
      });
      created.push({
        username: user.username,
        password: user.pinDisplay!,
        eventUserRoleName: user.eventUserRole.name,
      });
      createdAssigneeIds.push({ id: user.id, eventUserRoleSlug: user.eventUserRole.slug });
    } catch (error) {
      errors.push({
        row: i + 2,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const assignSettings = await getTeamAssignSettings(ctx.event.id);
  const assignableSlugs = assignableTeamRoleSlugs(assignSettings.includeStaff);
  const importedAssigneeIds = createdAssigneeIds
    .filter((user) => assignableSlugs.includes(user.eventUserRoleSlug))
    .map((user) => user.id);

  if (autoAssignTeams) {
    await assignTeams(ctx.event.id, { includeStaff: assignSettings.includeStaff });
  } else if (assignSettings.autoAssignOnImport && importedAssigneeIds.length > 0) {
    await assignTeams(ctx.event.id, {
      userIds: importedAssigneeIds,
      includeStaff: assignSettings.includeStaff,
    });
  }

  return NextResponse.json({
    created: created.length,
    errors,
    credentialSheet: created,
    pinSheet: created,
  });
}
