// Usage: npm run make-admin -- someone@example.com            (moderator, at most 3)
//        npm run make-admin -- someone@example.com --super    (the one super admin)
import { PrismaClient } from "@prisma/client";
import { MAX_MODERATORS } from "../src/lib/roles";

const prisma = new PrismaClient();
const email = process.argv[2]?.toLowerCase();
const superAdmin = process.argv.includes("--super");

async function main() {
  if (!email) throw new Error("Pass the email of an existing account");
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  if (superAdmin) {
    const current = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN", NOT: { id: user.id } } });
    if (current) throw new Error(`${current.email} is already the super admin; there can only be one`);
    await prisma.user.update({ where: { id: user.id }, data: { role: "SUPER_ADMIN" } });
    console.log(`${email} is now the super admin`);
    return;
  }
  const moderators = await prisma.user.count({ where: { role: "ADMIN", NOT: { id: user.id } } });
  if (moderators >= MAX_MODERATORS) throw new Error(`There are already ${MAX_MODERATORS} moderators`);
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  console.log(`${email} is now a moderator`);
}

main().finally(() => prisma.$disconnect());
