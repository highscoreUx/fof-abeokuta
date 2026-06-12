import { ACTIVITY_CATALOG } from "@/lib/activities/catalog";
import { seedActivityTypes } from "@/lib/activities/event-activities";
import { createAccount } from "@/lib/accounts";
import { prisma } from "@/lib/prisma";

async function activityTypesReady(): Promise<boolean> {
  const slugs = ACTIVITY_CATALOG.map((entry) => entry.slug);
  const count = await prisma.activityType.count({
    where: { slug: { in: slugs } },
  });
  return count === slugs.length;
}

async function platformAccountReady(): Promise<boolean> {
  const platformEmail = process.env.PLATFORM_ADMIN_EMAIL ?? "admin@fofabeokuta.com";
  return Boolean(await prisma.account.findUnique({ where: { email: platformEmail } }));
}

async function ensurePlatformAccount() {
  const platformEmail = process.env.PLATFORM_ADMIN_EMAIL ?? "admin@fofabeokuta.com";
  const platformPassword = process.env.PLATFORM_ADMIN_PASSWORD ?? "fofadmin123";
  const platformUsername = process.env.PLATFORM_ADMIN_USERNAME ?? "platform_admin";

  await createAccount({
    email: platformEmail,
    username: platformUsername,
    firstName: "Platform",
    lastName: "Admin",
    permissions: ["*"],
    password: platformPassword,
    mustChangePassword: process.env.NODE_ENV === "production",
    globalMember: true,
  });

  console.log(`[bootstrap] Platform account created: ${platformEmail}`);
  if (process.env.NODE_ENV !== "production") {
    console.log(`[bootstrap] Dev password: ${platformPassword}`);
  }
}

export async function ensurePlatformBootstrap(): Promise<{ skipped: boolean }> {
  const [typesReady, accountReady] = await Promise.all([
    activityTypesReady(),
    platformAccountReady(),
  ]);

  if (typesReady && accountReady) {
    return { skipped: true };
  }

  if (!typesReady) {
    await seedActivityTypes();
    console.log("[bootstrap] Activity types ensured.");
  }

  if (!accountReady) {
    await ensurePlatformAccount();
  }

  return { skipped: false };
}
