-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('BUSINESS_NAME', 'PARTNERSHIP', 'LIMITED_COMPANY', 'LLP');

-- CreateEnum
CREATE TYPE "RegistryStatus" AS ENUM ('NOT_CHECKED', 'MATCHED', 'MISMATCH', 'NOT_FOUND', 'ERROR', 'MANUALLY_VERIFIED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StoreDocumentKind" ADD VALUE 'REGISTRATION_CERTIFICATE';
ALTER TYPE "StoreDocumentKind" ADD VALUE 'CR12';

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "businessRegNo" TEXT,
ADD COLUMN     "businessType" "BusinessType",
ADD COLUMN     "registryCheckedAt" TIMESTAMP(3),
ADD COLUMN     "registryDetails" JSONB,
ADD COLUMN     "registrySource" TEXT,
ADD COLUMN     "registryStatus" "RegistryStatus" NOT NULL DEFAULT 'NOT_CHECKED';
