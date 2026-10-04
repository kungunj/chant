import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { normalizePartNumber } from "../src/lib/search";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const tech = await prisma.user.upsert({
    where: { email: "tech@example.com" },
    update: {},
    create: { email: "tech@example.com", name: "Wanjiru Electronics", phone: "254708374149", role: "TECHNICIAN", passwordHash },
  });
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", name: "SparesHub Moderator", phone: "254700000000", role: "ADMIN", passwordHash },
  });
  await prisma.user.upsert({
    where: { email: "buyer@example.com" },
    update: {},
    create: { email: "buyer@example.com", name: "Otieno Buyer", phone: "254712345678", role: "BUYER", passwordHash },
  });

  const store = await prisma.store.upsert({
    where: { ownerId: tech.id },
    update: {},
    create: {
      ownerId: tech.id,
      slug: "wanjiru-electronics",
      name: "Wanjiru Electronics",
      location: "Luthuli Avenue, Nairobi",
      description: "Tested spares for TVs, laptops and car radios.",
      // Demo store skips document review so the catalogue is visible straight away.
      status: "APPROVED",
      legalName: "Wanjiru Kamau",
      idType: "NATIONAL_ID",
      idNumber: "12345678",
      submittedAt: new Date(),
      reviewedAt: new Date(),
      reviewedById: admin.id,
    },
  });

  const products: Omit<Prisma.ProductCreateManyInput, "storeId" | "partNumberKey">[] = [
    { title: "Samsung 43\" TV power supply board", partNumber: "BN44-00807A", brand: "Samsung", modelName: "UA43J5200", category: "TV", condition: "USED_WORKING", priceKes: 3500, stock: 2, imageUrls: [] },
    { title: "Lenovo IdeaPad battery", partNumber: "L14M4P23", brand: "Lenovo", modelName: "Y50-70", category: "LAPTOP", condition: "NEW_SPARE", priceKes: 4800, stock: 5, imageUrls: [] },
    { title: "HP 15 laptop hinges (pair)", partNumber: "L52025-001", brand: "HP", modelName: "15-da", category: "LAPTOP", condition: "USED_WORKING", priceKes: 1200, stock: 4, imageUrls: [] },
    { title: "Toyota Premio head unit, dead, for parts", partNumber: "08545-00Q40", brand: "Toyota", category: "CAR", condition: "USED_FOR_PARTS", priceKes: 2500, stock: 1, imageUrls: [] },
    { title: "Sony radio tuner IC", partNumber: "LA1837", brand: "Sanyo", category: "RADIO", condition: "NEW_SPARE", priceKes: 350, stock: 20, imageUrls: [] },
  ];

  for (const p of products) {
    const exists = await prisma.product.findFirst({ where: { storeId: store.id, partNumber: p.partNumber } });
    if (exists) continue;
    await prisma.product.create({
      data: { ...p, storeId: store.id, partNumberKey: p.partNumber ? normalizePartNumber(p.partNumber) : null },
    });
  }
  console.log("Seeded. Log in as tech@example.com, buyer@example.com or admin@example.com with password123");
}

main().finally(() => prisma.$disconnect());
