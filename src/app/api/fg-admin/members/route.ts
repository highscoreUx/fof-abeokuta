import { NextRequest, NextResponse } from "next/server";
import { createAccount, normalizeUsername } from "@/lib/accounts";
import { generateUniqueUsername } from "@/lib/username";
import { deliverAccountCredentials } from "@/lib/account-credentials-notify";
import { buildAccountsOrderBy, buildAccountsWhere } from "@/lib/accounts-query";
import { jsonError } from "@/lib/auth/middleware";
import {
  parseGlobalMembersAudience,
} from "@/lib/member-access";
import {
  permissionsForMemberProfile,
  validateMemberProfileAssignment,
} from "@/lib/member-profile-assignment";
import { ensurePlatformRolesSeeded } from "@/lib/platform-roles.server";
import { parsePaginationParams, toPaginatedResponse } from "@/lib/pagination";
import { getProfileLabelForPermissions } from "@/lib/role-preset-cache";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { prisma } from "@/lib/prisma";
import { serializeMemberRow } from "@/lib/users";
import { createMemberSchema } from "@/lib/validators/members";

export async function GET(request: NextRequest) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  await ensurePlatformRolesSeeded();

  const { searchParams } = new URL(request.url);
  const query = parsePaginationParams(searchParams);
  const audience = parseGlobalMembersAudience(searchParams.get("view"));
  const where = buildAccountsWhere({ ...query, audience });

  const [accounts, total] = await Promise.all([
    prisma.account.findMany({
      where,
      orderBy: buildAccountsOrderBy(query.sortBy, query.sortOrder),
      skip: query.skip,
      take: query.limit,
      include: { _count: { select: { users: true } } },
    }),
    prisma.account.count({ where }),
  ]);

  return NextResponse.json(
    toPaginatedResponse(
      accounts.map((account) => serializeMemberRow(account)),
      total,
      query.page,
      query.limit,
    ),
  );
}

export async function POST(request: NextRequest) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const body = await request.json();
  const parsed = createMemberSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, "VALIDATION_ERROR", 400);
  }

  try {
    await ensurePlatformRolesSeeded();
    const assignmentError = validateMemberProfileAssignment(
      authResult.auth.permissions,
      parsed.data.permissionProfile,
    );
    if (assignmentError) {
      return jsonError(assignmentError, "FORBIDDEN", 403);
    }

    const permissions = permissionsForMemberProfile(parsed.data.permissionProfile);
    const username = parsed.data.username
      ? normalizeUsername(parsed.data.username)
      : await generateUniqueUsername(parsed.data.firstName, parsed.data.lastName);
    const { account, initialPassword } = await createAccount({
      email: parsed.data.email,
      username,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      middleName: parsed.data.middleName,
      password: parsed.data.password,
      permissions,
      mustChangePassword: true,
      globalMember: parsed.data.permissionProfile !== "participant",
    });

    const { emailQueued } = deliverAccountCredentials(account.id, initialPassword, "welcome");

    return NextResponse.json(
      {
        member: serializeMemberRow({ ...account, _count: { users: 0 } }),
        emailQueued,
        permissionProfile: getProfileLabelForPermissions(permissions),
      },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to create member",
      "CREATE_FAILED",
      400,
    );
  }
}
