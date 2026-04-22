import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function optimize() {
  console.log("Optimizing database...");
  
  // 1. Vacuum (SQLite specifically)
  await prisma.$executeRawUnsafe("VACUUM;");
  
  // 2. Analyze (to update statistics for query optimizer)
  await prisma.$executeRawUnsafe("ANALYZE;");
  
  console.log("Optimization complete.");
  await prisma.$disconnect();
}

optimize().catch(err => {
  console.error("Optimization failed:", err);
  process.exit(1);
});
