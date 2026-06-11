import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcrypt";
import { createEventWithDefaults } from "../src/lib/events";

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
      status: "DRAFT",
    });
  }

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
    },
    create: {
      eventId: event.id,
      role: "ADMIN",
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
  console.log(`Event: /${event.slug}/login — Admin: admin.portal / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
