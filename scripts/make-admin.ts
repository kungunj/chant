// Usage: npm run make-admin -- someone@example.com
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = process.argv[2]?.toLowerCase();

async function main() {
  if (!email) throw new Error("Pass the email of an existing account");
  const user = await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
  console.log(`${user.email} is now an admin/moderator`);
}

main().finally(() => prisma.$disconnect());
