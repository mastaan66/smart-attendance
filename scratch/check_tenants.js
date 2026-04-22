const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  console.log("Registered Tenants:", JSON.stringify(tenants, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
