import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { ensurePlatformBootstrap } from "../src/server/bootstrap";

async function main() {
  const result = await ensurePlatformBootstrap();
  if (result.skipped) {
    console.log("Bootstrap already complete — nothing to seed.");
    return;
  }
  console.log("Bootstrap complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
