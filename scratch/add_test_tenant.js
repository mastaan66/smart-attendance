const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const domain = "gmail.com";
  const existing = await prisma.tenant.findUnique({ where: { domain } });
  
  if (existing) {
    console.log("Domain already registered.");
    return;
  }

  const tenant = await prisma.tenant.create({
    data: {
      universityName: "Development Test University",
      domain: domain,
      location: "Developer Machine"
    }
  });

  console.log("Tenant created:", tenant);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
