-- CreateEnum
CREATE TYPE "SellerType" AS ENUM ('BUSINESS', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "NameCheckStatus" AS ENUM ('NOT_CHECKED', 'PENDING', 'MATCHED', 'MISMATCH', 'ERROR', 'MANUALLY_VERIFIED');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('ORDER', 'NAME_CHECK');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "purpose" "PaymentPurpose" NOT NULL DEFAULT 'ORDER';

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "mpesaName" TEXT,
ADD COLUMN     "mpesaNameCheckedAt" TIMESTAMP(3),
ADD COLUMN     "mpesaNameStatus" "NameCheckStatus" NOT NULL DEFAULT 'NOT_CHECKED',
ADD COLUMN     "mpesaPhone" TEXT,
ADD COLUMN     "nameCheckPaymentId" TEXT,
ADD COLUMN     "sellerType" "SellerType" NOT NULL DEFAULT 'BUSINESS';

-- CreateIndex
CREATE UNIQUE INDEX "Store_nameCheckPaymentId_key" ON "Store"("nameCheckPaymentId");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_nameCheckPaymentId_fkey" FOREIGN KEY ("nameCheckPaymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

