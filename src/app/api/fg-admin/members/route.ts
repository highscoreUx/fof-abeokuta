import { NextRequest, NextResponse } from "next/server";
import { createAccount } from "@/lib/accounts";
import { deliverAccountCredentials } from "@/lib/account-credentials-notify";
import { buildAccountsOrderBy, buildAccountsWhere } from "@/lib/accounts-query";
import { jsonError } from "@/lib/auth/middleware";
import {
  parseGlobalMembersAudience,
  permissionsForMemberProfileSlug,
} from "@/lib/member-access";
import { ensurePlatformRolesSeeded, getProfileBySlug } from "@/lib/platform-roles.server";
import { parsePaginationParams, toPaginatedResponse } from "@/lib/pagination";
import { getProfileLabelForPermissions } from "@/lib/permission-profiles";
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
    if (!getProfileBySlug(parsed.data.permissionProfile)) {
      return jsonError("Unknown role", "VALIDATION_ERROR", 400);
    }
    const permissions = permissionsForMemberProfileSlug(parsed.data.permissionProfile);
    const { account, initialPassword } = await createAccount({
      email: parsed.data.email,
      username: parsed.data.username,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      middleName: parsed.data.middleName,
      password: parsed.data.password,
      permissions,
      mustChangePassword: true,
      globalMember: true,
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
