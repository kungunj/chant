-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "markupKes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "registrationFeePaidAt" TIMESTAMP(3);

