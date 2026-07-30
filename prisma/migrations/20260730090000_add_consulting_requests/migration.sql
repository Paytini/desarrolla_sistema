-- CreateEnum
CREATE TYPE "ConsultingArea" AS ENUM ('LOGISTICS', 'FIRE_SAFETY', 'MANUFACTURING', 'INDUSTRIAL_SAFETY', 'ISO_STANDARDS', 'CONOCER_CERT', 'HUMAN_RESOURCES');

-- CreateEnum
CREATE TYPE "ConsultingContactMethod" AS ENUM ('CALL', 'WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "ConsultingRequestStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "consulting_requests" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "requested_by_user_id" INTEGER NOT NULL,
    "area" "ConsultingArea" NOT NULL,
    "context" TEXT NOT NULL,
    "preferred_date" DATE NOT NULL,
    "preferred_time" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Tijuana',
    "contact_phone" TEXT NOT NULL,
    "contact_method" "ConsultingContactMethod" NOT NULL,
    "status" "ConsultingRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consulting_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consulting_requests_company_id_idx" ON "consulting_requests"("company_id");

-- AddForeignKey
ALTER TABLE "consulting_requests" ADD CONSTRAINT "consulting_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consulting_requests" ADD CONSTRAINT "consulting_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
