import bcrypt from "bcrypt";
import { ACTIVITY_CATALOG } from "@/lib/activities/catalog";
import { seedActivityTypes } from "@/lib/activities/event-activities";
import { prisma } from "@/lib/prisma";

async function activityTypesReady(): Promise<boolean> {
  const slugs = ACTIVITY_CATALOG.map((entry) => entry.slug);
  const count = await prisma.activityType.count({
    where: { slug: { in: slugs } },
  });
  return count === slugs.length;
}

async function platformAdminReady(): Promise<boolean> {
  return (await prisma.platformAdmin.count()) > 0;
}

async function ensurePlatformAdmin() {
  const platformEmail = process.env.PLATFORM_ADMIN_EMAIL ?? "admin@fofabeokuta.com";
  const platformPassword = process.env.PLATFORM_ADMIN_PASSWORD ?? "fofadmin123";
  const passwordHash = await bcrypt.hash(platformPassword, 10);

  await prisma.platformAdmin.create({
    data: {
      email: platformEmail,
      passwordHash,
      name: "Platform Admin",
    },
  });

  console.log(`[bootstrap] Platform admin created: ${platformEmail}`);
  if (process.env.NODE_ENV !== "production") {
    console.log(`[bootstrap] Dev password: ${platformPassword}`);
  }
}

export async function ensurePlatformBootstrap(): Promise<{ skipped: boolean }> {
  const [typesReady, adminReady] = await Promise.all([
    activityTypesReady(),
    platformAdminReady(),
  ]);

  if (typesReady && adminReady) {
    return { skipped: true };
  }

  if (!typesReady) {
    await seedActivityTypes();
    console.log("[bootstrap] Activity types ensured.");
  }

  if (!adminReady) {
    await ensurePlatformAdmin();
  }

  return { skipped: false };
}
