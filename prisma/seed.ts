import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcrypt";
import { createEventWithDefaults } from "../src/lib/events";
import { getEventUserRoleBySlug } from "../src/lib/event-user-roles";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const platformEmail = process.env.PLATFORM_ADMIN_EMAIL ?? "admin@fofabeokuta.com";
  const platformPassword = process.env.PLATFORM_ADMIN_PASSWORD ?? "fofadmin123";
  const passwordHash = await bcrypt.hash(platformPassword, 10);

  await prisma.platformAdmin.upsert({
    where: { email: platformEmail },
    update: {},
    create: {
      email: platformEmail,
      passwordHash,
      name: "Platform Admin",
    },
  });

  const existingEvent = await prisma.event.findUnique({
    where: { slug: "your-start-up-in-x-hours" },
  });

  let event = existingEvent;
  if (!event) {
    event = await createEventWithDefaults({
      title: "Your Start Up in X hours",
      description: "FOF Abeokuta flagship startup event",
      date: new Date(),
      status: "LIVE",
    });
  } else if (event.status !== "LIVE") {
    event = await prisma.event.update({
      where: { id: event.id },
      data: { status: "LIVE" },
    });
  }

  const { seedDefaultEventUserRoles } = await import("../src/lib/event-user-roles");
  await seedDefaultEventUserRoles(event.id);

  const eventAdminRole = await getEventUserRoleBySlug(event.id, "event_admin");
  if (!eventAdminRole) throw new Error("Missing event_admin role");

  const adminPassword = "0001";
  const adminHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: {
      eventId_username: { eventId: event.id, username: "admin.portal" },
    },
    update: {
      pinHash: adminHash,
      pinDisplay: adminPassword,
      loginPhrase: "portal",
      eventUserRoleId: eventAdminRole.id,
    },
    create: {
      eventId: event.id,
      eventUserRoleId: eventAdminRole.id,
      pinHash: adminHash,
      pinDisplay: adminPassword,
      loginPhrase: "portal",
      firstName: "Admin",
      lastName: "System",
      username: "admin.portal",
      email: "admin.portal@event.local",
    },
  });

  console.log("Seed complete.");
  console.log(`Platform admin: ${platformEmail} / ${platformPassword}`);
  console.log(`Current event: / and /login — Admin: admin.portal / ${adminPassword}`);
  console.log(`Event pages: /${event.slug} and /${event.slug}/login`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
