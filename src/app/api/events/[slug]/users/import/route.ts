import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { isTeamAssignableMember } from "@/lib/account-permissions";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { userImportRowSchema } from "@/lib/validators/auth";
import { assignTeams, assignableTeamRoleSlugs, getTeamAssignSettings } from "@/lib/team-assign";
import { createUserFromRow } from "@/lib/users";
import { pickUserProfile } from "@/lib/user-display";
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
  const created: Array<{
    email: string;
    username: string;
    password: string;
    permissionProfile: string;
  }> = [];
  const createdAssigneeIds: string[] = [];
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const parsed = userImportRowSchema.safeParse({
      email: row.email ?? row.EMAIL,
      username: row.username ?? row.USERNAME,
      firstName: row.firstName ?? row.first_name,
      lastName: row.lastName ?? row.last_name,
      middleName: row.middleName ?? row.middle_name,
      permissionProfile: row.permissionProfile ?? row.profile,
      role: (row.role ?? "PARTICIPANT").toUpperCase(),
      password: row.password ?? row.PASSWORD,
    });

    if (!parsed.success) {
      errors.push({ row: i + 2, error: parsed.error.message });
      continue;
    }

    try {
      const { user, initialPassword, permissionProfile } = await createUserFromRow(
        ctx.event.id,
        parsed.data,
      );
      const profile = pickUserProfile(user);
      created.push({
        email: profile.email ?? "(no email — set at check-in)",
        username: profile.username,
        password: initialPassword ?? "(existing account — password unchanged)",
        permissionProfile,
      });
      if (isTeamAssignableMember(user.account.permissions as never, false)) {
        createdAssigneeIds.push(user.id);
      }
    } catch (error) {
      errors.push({
        row: i + 2,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const assignSettings = await getTeamAssignSettings(ctx.event.id);
  const assignableSlugs = assignableTeamRoleSlugs(assignSettings.includeStaff);

  if (autoAssignTeams) {
    await assignTeams(ctx.event.id, { includeStaff: assignSettings.includeStaff });
  } else if (assignSettings.autoAssignOnImport && createdAssigneeIds.length > 0) {
    await assignTeams(ctx.event.id, {
      userIds: createdAssigneeIds,
      includeStaff: assignSettings.includeStaff,
    });
  }

  void assignableSlugs;

  return NextResponse.json({
    created: created.length,
    errors,
    credentialSheet: created,
  });
}
