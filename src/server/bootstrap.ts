import { OFFICIAL_ACTIVITY_SLUGS } from "@/lib/activities/manifest";
import { seedActivityTypes } from "@/lib/activities/event-activities";
import { createAccount } from "@/lib/accounts";
import { deliverAccountCredentials } from "@/lib/account-credentials-notify";
import { ensurePlatformRolesSeeded } from "@/lib/platform-roles.server";
import { prisma } from "@/lib/prisma";
import { canEnqueueEmails } from "@/server/queue/publish";

const DEFAULT_PLATFORM_EMAIL = "boyesiji@gmail.com";

async function activityTypesReady(): Promise<boolean> {
  const slugs = [...OFFICIAL_ACTIVITY_SLUGS];
  const count = await prisma.activityType.count({
    where: { slug: { in: slugs } },
  });
  return count === slugs.length;
}

async function platformAccountReady(): Promise<boolean> {
  const platformEmail = process.env.PLATFORM_ADMIN_EMAIL ?? DEFAULT_PLATFORM_EMAIL;
  return Boolean(await prisma.account.findUnique({ where: { email: platformEmail } }));
}

async function platformRolesReady(): Promise<boolean> {
  return (await prisma.platformRole.count()) > 0;
}

async function ensurePlatformAccount() {
  const platformEmail = process.env.PLATFORM_ADMIN_EMAIL ?? DEFAULT_PLATFORM_EMAIL;
  const platformUsername = process.env.PLATFORM_ADMIN_USERNAME ?? "platform_admin";
  const firstName = process.env.PLATFORM_ADMIN_FIRST_NAME?.trim() || "Abdulbasit";
  const lastName = process.env.PLATFORM_ADMIN_LAST_NAME?.trim() || "Oyesiji";

  const { account, initialPassword } = await createAccount({
    email: platformEmail,
    username: platformUsername,
    firstName,
    lastName,
    permissions: ["*"],
    mustChangePassword: true,
    globalMember: true,
  });

  console.log(`[bootstrap] Platform account created: ${platformEmail}`);

  const { emailQueued } = deliverAccountCredentials(account.id, initialPassword, "welcome");
  if (emailQueued) {
    console.log(`[bootstrap] Credentials email queued for ${platformEmail}`);
  } else if (!canEnqueueEmails()) {
    console.log(`[bootstrap] Email queue not configured — dev password: ${initialPassword}`);
  }
}

async function syncPlatformAdminLegacyName() {
  const platformEmail = process.env.PLATFORM_ADMIN_EMAIL ?? DEFAULT_PLATFORM_EMAIL;
  const firstName = process.env.PLATFORM_ADMIN_FIRST_NAME?.trim() || "Abdulbasit";
  const lastName = process.env.PLATFORM_ADMIN_LAST_NAME?.trim() || "Oyesiji";

  const account = await prisma.account.findUnique({ where: { email: platformEmail } });
  if (!account) return;

  if (account.firstName === "Platform" && account.lastName === "Admin") {
    await prisma.account.update({
      where: { id: account.id },
      data: { firstName, lastName },
    });
    console.log(`[bootstrap] Platform admin name updated to ${firstName} ${lastName}`);
  }
}

export async function ensurePlatformBootstrap(): Promise<{ skipped: boolean }> {
  const [typesReady, accountReady, rolesReady] = await Promise.all([
    activityTypesReady(),
    platformAccountReady(),
    platformRolesReady(),
  ]);

  if (typesReady && accountReady && rolesReady) {
    await ensurePlatformRolesSeeded();
    await syncPlatformAdminLegacyName();
    return { skipped: true };
  }

  if (!typesReady) {
    await seedActivityTypes();
    console.log("[bootstrap] Activity types ensured.");
  }

  if (!rolesReady) {
    await ensurePlatformRolesSeeded();
    console.log("[bootstrap] Platform roles ensured.");
  }

  if (!accountReady) {
    await ensurePlatformAccount();
  } else {
    await syncPlatformAdminLegacyName();
  }

  return { skipped: false };
}
